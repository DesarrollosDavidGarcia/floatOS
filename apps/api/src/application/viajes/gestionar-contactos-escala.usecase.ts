import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCotizacion } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Un contacto (persona a cargo) que recibe el aviso de llegada a una escala. */
export interface ContactoEscalaInput {
  nombre: string;
  email?: string;
  telefono?: string;
}

/**
 * Caso de uso: gestionar (reemplazar) las personas a cargo de una escala que
 * reciben el aviso de llegada del transportista.
 *
 * Reglas:
 * - La escala debe pertenecer al viaje indicado.
 * - Solo se permite si el viaje tiene una cotización ACEPTADA (la "gente a
 *   cargo" se define una vez confirmado el servicio).
 * - Es un reemplazo completo e idempotente: borra los contactos previos y crea
 *   los nuevos en una transacción.
 */
@Injectable()
export class GestionarContactosEscalaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    viajeId: string,
    escalaId: string,
    contactos: ContactoEscalaInput[],
  ) {
    const escala = await this.prisma.escalaViaje.findFirst({
      where: { id: escalaId, viajeId },
      select: { id: true },
    });
    if (!escala) {
      throw new NotFoundException(
        'Escala no encontrada para este viaje',
      );
    }

    const aceptadas = await this.prisma.cotizacion.count({
      where: { viajeId, estado: EstadoCotizacion.ACEPTADA },
    });
    if (aceptadas === 0) {
      throw new ConflictException(
        'Solo puedes registrar contactos cuando el viaje tiene una cotización aceptada',
      );
    }

    // Reemplazo atómico: limpiar y recrear los contactos de la escala.
    await this.prisma.$transaction(async (tx) => {
      await tx.contactoEscala.deleteMany({ where: { escalaId } });
      if (contactos.length > 0) {
        await tx.contactoEscala.createMany({
          data: contactos.map((c) => ({
            escalaId,
            nombre: c.nombre,
            email: c.email?.trim() || null,
            telefono: c.telefono?.trim() || null,
          })),
        });
      }
    });

    return this.prisma.contactoEscala.findMany({
      where: { escalaId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
