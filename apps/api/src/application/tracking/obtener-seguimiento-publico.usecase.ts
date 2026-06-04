import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SeguimientoPublico } from './tracking.types';

/**
 * Caso de uso: datos públicos de seguimiento para el link del cliente final.
 * SIN autenticación. No expone datos sensibles del conductor (sólo su nombre).
 */
@Injectable()
export class ObtenerSeguimientoPublicoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(token: string): Promise<SeguimientoPublico> {
    const viaje = await this.prisma.viaje.findUnique({
      where: { trackingToken: token },
      select: {
        folio: true,
        estado: true,
        origenDireccion: true,
        destinoDireccion: true,
        cliente: { select: { razonSocial: true } },
        conductor: { select: { nombre: true } },
        ubicaciones: {
          orderBy: { capturadoEn: 'desc' },
          take: 1,
          select: {
            lat: true,
            lng: true,
            velocidad: true,
            rumbo: true,
            capturadoEn: true,
          },
        },
      },
    });

    if (!viaje) {
      throw new NotFoundException('Enlace de seguimiento no válido');
    }

    const ultima = viaje.ubicaciones[0] ?? null;

    return {
      folio: viaje.folio,
      estado: viaje.estado,
      origenDireccion: viaje.origenDireccion,
      destinoDireccion: viaje.destinoDireccion,
      cliente: { razonSocial: viaje.cliente.razonSocial },
      conductor: viaje.conductor ? { nombre: viaje.conductor.nombre } : null,
      ultimaUbicacion: ultima
        ? {
            lat: ultima.lat,
            lng: ultima.lng,
            velocidad: ultima.velocidad,
            rumbo: ultima.rumbo,
            capturadoEn: ultima.capturadoEn,
          }
        : null,
    };
  }
}
