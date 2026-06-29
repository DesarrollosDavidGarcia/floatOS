import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { simularCarga } from '../../domain/viaje/motor-calculo';
import { MotorViajeService } from './motor-viaje.service';
import {
  derivarResumen,
  itemsDeEscalas,
  nestedEscalasCreate,
  snapshotRuta,
} from './viaje-escalas.helper';
import { EditarViajeInput, RELACIONES_DETALLE } from './viajes.types';

/**
 * Caso de uso: editar un viaje (no el estado ni la asignación). Si vienen
 * `escalas`, reemplazan el itinerario completo (borrar + recrear) y se recalcula
 * el resumen y el snapshot del motor.
 */
@Injectable()
export class EditarViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly motor: MotorViajeService,
  ) {}

  // El itinerario solo puede reescribirse antes de iniciar el viaje.
  private static readonly ESTADOS_EDITABLES: readonly string[] = [
    'ASIGNADO',
    'ACEPTADO',
  ];

  async execute(id: string, input: EditarViajeInput) {
    const existe = await this.prisma.viaje.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        fechaProgramada: true,
        tipoServicio: true,
      },
    });
    if (!existe) {
      throw new NotFoundException(`Viaje con id ${id} no encontrado`);
    }

    // Tipo efectivo: el que se envía o, si no, el guardado.
    const tipoServicio = input.tipoServicio ?? existe.tipoServicio;
    const esPersonal = tipoServicio === 'PERSONAL';
    if (esPersonal && (!input.numPasajeros || input.numPasajeros < 1)) {
      throw new BadRequestException(
        'Indica el número de pasajeros del servicio de personal',
      );
    }
    // Campos de tipo de servicio a actualizar en cualquiera de las dos ramas.
    const datosServicio = {
      tipoServicio,
      numPasajeros: esPersonal ? input.numPasajeros : null,
    };

    const fechaProgramada =
      input.fechaProgramada !== undefined
        ? new Date(input.fechaProgramada)
        : undefined;

    if (input.escalas &&
      !EditarViajeUseCase.ESTADOS_EDITABLES.includes(existe.estado)) {
      throw new ConflictException(
        `No se puede modificar el itinerario de un viaje en estado ${existe.estado}`,
      );
    }

    if (!input.escalas) {
      return this.prisma.viaje.update({
        where: { id },
        data: { fechaProgramada, ...datosServicio },
        include: RELACIONES_DETALLE,
      });
    }

    if (input.escalas.length < 2) {
      throw new BadRequestException(
        'El itinerario requiere al menos origen y destino',
      );
    }

    const sim = simularCarga(itemsDeEscalas(input.escalas));
    // departAt = fecha programada efectiva (la nueva o la ya guardada) → tráfico predicho.
    const departAt = (fechaProgramada ?? existe.fechaProgramada)?.toISOString();
    const ruta = await this.motor.distanciaKm(input.escalas, { departAt });
    const resumen = derivarResumen(input.escalas, sim, esPersonal);

    const data: Prisma.ViajeUpdateInput = {
      ...resumen,
      ...snapshotRuta(ruta),
      ...datosServicio,
      fechaProgramada,
      escalas: { create: nestedEscalasCreate(input.escalas) },
    };

    // Reemplazo atómico del itinerario: borrar escalas (cascada → cargas y
    // contactos) y recrear. Los contactos de aviso de llegada se conservan
    // re-emparejándolos por `orden` (la parada en la misma posición los hereda);
    // las paradas que desaparezcan pierden sus contactos.
    return this.prisma.$transaction(async (tx) => {
      const previas = await tx.escalaViaje.findMany({
        where: { viajeId: id },
        select: {
          orden: true,
          contactos: { select: { nombre: true, email: true, telefono: true } },
        },
      });
      const contactosPorOrden = new Map(
        previas
          .filter((e) => e.contactos.length > 0)
          .map((e) => [e.orden, e.contactos]),
      );

      await tx.escalaViaje.deleteMany({ where: { viajeId: id } });
      await tx.viaje.update({ where: { id }, data });

      if (contactosPorOrden.size > 0) {
        const nuevas = await tx.escalaViaje.findMany({
          where: { viajeId: id },
          select: { id: true, orden: true },
        });
        const aCrear = nuevas.flatMap((n) => {
          const cs = contactosPorOrden.get(n.orden);
          return cs
            ? cs.map((c) => ({
                escalaId: n.id,
                nombre: c.nombre,
                email: c.email,
                telefono: c.telefono,
              }))
            : [];
        });
        if (aCrear.length > 0) {
          await tx.contactoEscala.createMany({ data: aCrear });
        }
      }

      return tx.viaje.findUniqueOrThrow({
        where: { id },
        include: RELACIONES_DETALLE,
      });
    });
  }
}
