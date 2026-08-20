import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoViaje, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { AsignarViajeInput, RELACIONES_RESUMEN } from './viajes.types';
import {
  asegurarCajaDisponible,
  asegurarConductorDisponible,
  bloquearRecursosAsignacion,
  bloquearViaje,
  ClientePrisma,
} from './disponibilidad-conductor.helper';

/** Estados finales en los que ya no tiene sentido reasignar. */
const ESTADOS_TERMINALES: ReadonlySet<EstadoViaje> = new Set([
  EstadoViaje.FACTURADO,
  EstadoViaje.CANCELADO,
]);

/** Campos del viaje necesarios para el guard y el snapshot de auditoría. */
const SELECT_ACTUAL = {
  estado: true,
  folio: true,
  unidadId: true,
  cajaId: true,
  conductorId: true,
  unidad: { select: { placas: true } },
  caja: { select: { placas: true } },
  conductor: { select: { nombre: true, apellidos: true } },
} satisfies Prisma.ViajeSelect;

type ViajeActual = Prisma.ViajeGetPayload<{ select: typeof SELECT_ACTUAL }>;

/** Nombre completo legible de un conductor (o "Sin conductor"). */
function nombreConductor(c: { nombre: string; apellidos: string | null } | null): string {
  if (!c) return 'Sin conductor';
  return `${c.nombre} ${c.apellidos ?? ''}`.trim();
}

/** Caso de uso: asignar o reasignar unidad y/o conductor a un viaje. */
@Injectable()
export class AsignarViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingGateway,
  ) {}

  async execute(id: string, input: AsignarViajeInput, registradoPor?: string) {
    if (
      input.unidadId === undefined &&
      input.cajaId === undefined &&
      input.conductorId === undefined
    ) {
      throw new BadRequestException(
        'Debe indicar al menos unidadId, cajaId o conductorId',
      );
    }

    // Estado actual + asignación previa (para el guard y el snapshot de
    // auditoría). Esta lectura es solo para fallar rápido: la que manda es la
    // que se repite dentro de la transacción, ya con el viaje bloqueado.
    const actual = await this.leerActual(this.prisma, id);
    if (!actual) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }
    this.asegurarReasignable(actual);

    // Validaciones de existencia solo cuando se asigna un id (string). `null`
    // significa desasignar; `undefined` significa no tocar ese campo.
    const [unidad, caja, conductor] = await Promise.all([
      typeof input.unidadId === 'string'
        ? this.prisma.unidad.findUnique({ where: { id: input.unidadId } })
        : Promise.resolve(null),
      typeof input.cajaId === 'string'
        ? this.prisma.caja.findUnique({ where: { id: input.cajaId } })
        : Promise.resolve(null),
      typeof input.conductorId === 'string'
        ? this.prisma.conductor.findUnique({ where: { id: input.conductorId } })
        : Promise.resolve(null),
    ]);

    const data: Prisma.ViajeUpdateInput = {};

    if (input.unidadId === null) {
      data.unidad = { disconnect: true };
    } else if (typeof input.unidadId === 'string') {
      if (!unidad) {
        throw new NotFoundException(
          `Unidad con id ${input.unidadId} no encontrada`,
        );
      }
      if (!unidad.activo) {
        throw new BadRequestException(
          `La unidad ${input.unidadId} está inactiva`,
        );
      }
      data.unidad = { connect: { id: input.unidadId } };
    }

    if (input.cajaId === null) {
      data.caja = { disconnect: true };
    } else if (typeof input.cajaId === 'string') {
      if (!caja) {
        throw new NotFoundException(`Caja con id ${input.cajaId} no encontrada`);
      }
      if (!caja.activo) {
        throw new BadRequestException(`La caja ${input.cajaId} está inactiva`);
      }
      data.caja = { connect: { id: input.cajaId } };
    }

    if (input.conductorId === null) {
      data.conductor = { disconnect: true };
    } else if (typeof input.conductorId === 'string') {
      if (!conductor) {
        throw new NotFoundException(
          `Conductor con id ${input.conductorId} no encontrado`,
        );
      }
      if (!conductor.activo) {
        throw new BadRequestException(
          `El conductor ${input.conductorId} está inactivo`,
        );
      }
      data.conductor = { connect: { id: input.conductorId } };
    }

    // Check temprano de doble-reserva: responde 409 sin abrir transacción en el
    // caso normal (recurso ya ocupado). No basta por sí solo — se repite dentro
    // de la transacción, que es donde la garantía es real.
    await this.asegurarDisponibles(this.prisma, id, input);

    const { viaje, cambios, previo } = await this.prisma.$transaction(
      async (tx) => {
        // Locks en orden fijo (viaje -> caja -> conductor) para no interbloquear.
        if (!(await bloquearViaje(tx, id))) {
          throw new NotFoundException(`Viaje con id ${id} no encontrado`);
        }
        await bloquearRecursosAsignacion(tx, {
          cajaId: typeof input.cajaId === 'string' ? input.cajaId : null,
          conductorId:
            typeof input.conductorId === 'string' ? input.conductorId : null,
        });

        // Re-lectura autoritativa: entre el check temprano y este punto el viaje
        // pudo cancelarse, y el conductor o la caja pudo ocuparse en otro viaje.
        const previo = await this.leerActual(tx, id);
        if (!previo) {
          throw new NotFoundException(`Viaje con id ${id} no encontrado`);
        }
        this.asegurarReasignable(previo);
        await this.asegurarDisponibles(tx, id, input);

        const cambios = this.calcularCambios(previo, input);

        const viaje = await tx.viaje.update({
          where: { id },
          data,
          include: RELACIONES_RESUMEN,
        });

        // Auditoría: solo si algo cambió de verdad.
        if (cambios.huboCambio) {
          await tx.historialAsignacionViaje.create({
            data: {
              viajeId: id,
              unidadAnterior: cambios.unidadCambio
                ? (previo.unidad?.placas ?? 'Sin unidad')
                : null,
              unidadNueva: cambios.unidadCambio
                ? (unidad?.placas ?? 'Sin unidad')
                : null,
              cajaAnterior: cambios.cajaCambio
                ? (previo.caja?.placas ?? 'Sin caja')
                : null,
              cajaNueva: cambios.cajaCambio
                ? (caja?.placas ?? 'Sin caja')
                : null,
              conductorAnterior: cambios.conductorCambio
                ? nombreConductor(previo.conductor)
                : null,
              conductorNuevo: cambios.conductorCambio
                ? nombreConductor(conductor)
                : null,
              motivo: input.motivo?.trim() || null,
              nota: input.nota?.trim() || null,
              registradoPor: registradoPor ?? null,
            },
          });
        }
        return { viaje, cambios, previo };
      },
    );

    // Aviso en tiempo real al conductor saliente, al entrante y al panel.
    if (cambios.huboCambio) {
      this.tracking.emitirReasignacion({
        viajeId: id,
        folio: previo.folio,
        conductorAnteriorId: cambios.conductorCambio
          ? previo.conductorId
          : null,
        conductorNuevoId: cambios.conductorCambio
          ? cambios.conductorNuevoId
          : null,
        unidadCambio: cambios.unidadCambio,
        cajaCambio: cambios.cajaCambio,
        conductorCambio: cambios.conductorCambio,
        motivo: input.motivo?.trim() || null,
      });
    }

    return viaje;
  }

  /** Estado + asignación previa del viaje (o `null` si no existe). */
  private leerActual(db: ClientePrisma, id: string) {
    return db.viaje.findUnique({ where: { id }, select: SELECT_ACTUAL });
  }

  private asegurarReasignable(viaje: Pick<ViajeActual, 'estado'>): void {
    if (ESTADOS_TERMINALES.has(viaje.estado)) {
      throw new ConflictException(
        'No se puede reasignar un viaje finalizado o cancelado',
      );
    }
  }

  /** 409 si la caja o el conductor entrantes ya están en otro viaje abierto. */
  private async asegurarDisponibles(
    db: ClientePrisma,
    viajeId: string,
    input: AsignarViajeInput,
  ): Promise<void> {
    // Una caja ya enganchada a otro viaje abierto no puede ir en este (409).
    if (typeof input.cajaId === 'string') {
      await asegurarCajaDisponible(db, input.cajaId, viajeId);
    }
    // Un conductor con un viaje abierto no puede recibir otro (409);
    // reasignarlo al mismo viaje sí está permitido.
    if (typeof input.conductorId === 'string') {
      await asegurarConductorDisponible(db, input.conductorId, viajeId);
    }
  }

  /** ¿Qué cambió realmente? (compara contra la asignación previa). */
  private calcularCambios(previo: ViajeActual, input: AsignarViajeInput) {
    const unidadNuevaId =
      input.unidadId === undefined ? previo.unidadId : input.unidadId;
    const cajaNuevaId =
      input.cajaId === undefined ? previo.cajaId : input.cajaId;
    const conductorNuevoId =
      input.conductorId === undefined ? previo.conductorId : input.conductorId;
    const unidadCambio =
      input.unidadId !== undefined && unidadNuevaId !== previo.unidadId;
    const cajaCambio =
      input.cajaId !== undefined && cajaNuevaId !== previo.cajaId;
    const conductorCambio =
      input.conductorId !== undefined &&
      conductorNuevoId !== previo.conductorId;
    return {
      conductorNuevoId,
      unidadCambio,
      cajaCambio,
      conductorCambio,
      huboCambio: unidadCambio || cajaCambio || conductorCambio,
    };
  }
}
