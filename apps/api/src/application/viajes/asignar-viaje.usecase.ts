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
import { asegurarConductorDisponible } from './disponibilidad-conductor.helper';

/** Estados finales en los que ya no tiene sentido reasignar. */
const ESTADOS_TERMINALES: ReadonlySet<EstadoViaje> = new Set([
  EstadoViaje.FACTURADO,
  EstadoViaje.CANCELADO,
]);

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
    if (input.unidadId === undefined && input.conductorId === undefined) {
      throw new BadRequestException(
        'Debe indicar al menos unidadId o conductorId',
      );
    }

    // Estado actual + asignación previa (para el guard y el snapshot de auditoría).
    const actual = await this.prisma.viaje.findUnique({
      where: { id },
      select: {
        estado: true,
        folio: true,
        unidadId: true,
        conductorId: true,
        unidad: { select: { placas: true } },
        conductor: { select: { nombre: true, apellidos: true } },
      },
    });
    if (!actual) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }
    if (ESTADOS_TERMINALES.has(actual.estado)) {
      throw new ConflictException(
        'No se puede reasignar un viaje finalizado o cancelado',
      );
    }

    // Validaciones de existencia solo cuando se asigna un id (string). `null`
    // significa desasignar; `undefined` significa no tocar ese campo.
    const [unidad, conductor] = await Promise.all([
      typeof input.unidadId === 'string'
        ? this.prisma.unidad.findUnique({ where: { id: input.unidadId } })
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
      // Un conductor con un viaje abierto no puede recibir otro (409);
      // reasignarlo al mismo viaje sí está permitido.
      await asegurarConductorDisponible(this.prisma, input.conductorId, id);
      data.conductor = { connect: { id: input.conductorId } };
    }

    // ¿Qué cambió realmente? (compara contra la asignación previa).
    const unidadNuevaId =
      input.unidadId === undefined ? actual.unidadId : input.unidadId;
    const conductorNuevoId =
      input.conductorId === undefined ? actual.conductorId : input.conductorId;
    const unidadCambio =
      input.unidadId !== undefined && unidadNuevaId !== actual.unidadId;
    const conductorCambio =
      input.conductorId !== undefined && conductorNuevoId !== actual.conductorId;

    const actualizado = await this.prisma.$transaction(async (tx) => {
      const viaje = await tx.viaje.update({
        where: { id },
        data,
        include: RELACIONES_RESUMEN,
      });

      // Auditoría: solo si algo cambió de verdad.
      if (unidadCambio || conductorCambio) {
        await tx.historialAsignacionViaje.create({
          data: {
            viajeId: id,
            unidadAnterior: unidadCambio
              ? (actual.unidad?.placas ?? 'Sin unidad')
              : null,
            unidadNueva: unidadCambio
              ? (unidad?.placas ?? 'Sin unidad')
              : null,
            conductorAnterior: conductorCambio
              ? nombreConductor(actual.conductor)
              : null,
            conductorNuevo: conductorCambio
              ? nombreConductor(conductor)
              : null,
            motivo: input.motivo?.trim() || null,
            nota: input.nota?.trim() || null,
            registradoPor: registradoPor ?? null,
          },
        });
      }
      return viaje;
    });

    // Aviso en tiempo real al conductor saliente, al entrante y al panel.
    if (unidadCambio || conductorCambio) {
      this.tracking.emitirReasignacion({
        viajeId: id,
        folio: actual.folio,
        conductorAnteriorId: conductorCambio ? actual.conductorId : null,
        conductorNuevoId: conductorCambio ? conductorNuevoId : null,
        unidadCambio,
        conductorCambio,
        motivo: input.motivo?.trim() || null,
      });
    }

    return actualizado;
  }
}
