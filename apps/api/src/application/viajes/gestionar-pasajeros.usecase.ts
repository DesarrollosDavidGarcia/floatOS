import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Un pasajero del manifiesto de un viaje de personal. */
export interface PasajeroViajeInput {
  nombre: string;
  identificacion?: string;
  telefono?: string;
  /** Parada donde sube (opcional; debe pertenecer al viaje). */
  escalaId?: string;
}

/**
 * Caso de uso: gestionar (reemplazar) el manifiesto de pasajeros de un viaje de
 * transporte de personal.
 *
 * Reglas:
 * - El viaje debe existir y ser de tipo PERSONAL.
 * - `escalaId` (si viene) debe pertenecer al viaje.
 * - Reemplazo completo e idempotente: borra los pasajeros previos y crea los
 *   nuevos en una transacción.
 */
@Injectable()
export class GestionarPasajerosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(viajeId: string, pasajeros: PasajeroViajeInput[]) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: { id: true, tipoServicio: true },
    });
    if (!viaje) {
      throw new NotFoundException(`Viaje con id ${viajeId} no encontrado`);
    }
    if (viaje.tipoServicio !== 'PERSONAL') {
      throw new ConflictException(
        'Solo los servicios de personal tienen manifiesto de pasajeros',
      );
    }

    const escalaIds = [
      ...new Set(
        pasajeros.map((p) => p.escalaId).filter((id): id is string => !!id),
      ),
    ];
    if (escalaIds.length > 0) {
      const enViaje = await this.prisma.escalaViaje.count({
        where: { viajeId, id: { in: escalaIds } },
      });
      if (enViaje !== escalaIds.length) {
        throw new BadRequestException(
          'Una de las paradas indicadas no pertenece al viaje',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pasajeroViaje.deleteMany({ where: { viajeId } });
      if (pasajeros.length > 0) {
        await tx.pasajeroViaje.createMany({
          data: pasajeros.map((p) => ({
            viajeId,
            nombre: p.nombre.trim(),
            identificacion: p.identificacion?.trim() || null,
            telefono: p.telefono?.trim() || null,
            escalaId: p.escalaId || null,
          })),
        });
      }
    });

    return this.prisma.pasajeroViaje.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
