import { Injectable } from '@nestjs/common';
import type { AlertaLlegadaPayload } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Ventana del historial de llegadas que se devuelve al panel (días hacia atrás). */
const DIAS_HISTORIAL = 7;
const LIMITE = 50;

/**
 * Caso de uso: historial reciente de llegadas (escalas con geocerca disparada)
 * para hidratar la campana de notificaciones del panel al montar — así el
 * historial sobrevive a recargas, otros dispositivos y llegadas ocurridas
 * mientras el panel estaba cerrado. Reusa el contrato `AlertaLlegadaPayload`.
 */
@Injectable()
export class ListarLlegadasRecientesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<AlertaLlegadaPayload[]> {
    const desde = new Date(Date.now() - DIAS_HISTORIAL * 24 * 60 * 60 * 1000);

    const escalas = await this.prisma.escalaViaje.findMany({
      where: { llegadaNotificadaEn: { gte: desde } },
      orderBy: { llegadaNotificadaEn: 'desc' },
      take: LIMITE,
      select: {
        viajeId: true,
        orden: true,
        accion: true,
        direccion: true,
        llegadaNotificadaEn: true,
        viaje: { select: { folio: true } },
      },
    });
    if (escalas.length === 0) return [];

    // Orden del destino (última escala) por viaje, para marcar `esDestino`.
    const viajeIds = [...new Set(escalas.map((e) => e.viajeId))];
    const maximos = await this.prisma.escalaViaje.groupBy({
      by: ['viajeId'],
      where: { viajeId: { in: viajeIds } },
      _max: { orden: true },
    });
    const ordenDestino = new Map(
      maximos.map((m) => [m.viajeId, m._max.orden]),
    );

    return escalas.map((e) => ({
      tipo: 'llegada_escala',
      viajeId: e.viajeId,
      folio: e.viaje?.folio ?? null,
      escalaOrden: e.orden,
      escalaAccion: e.accion,
      escalaDireccion: e.direccion,
      esDestino: e.orden === ordenDestino.get(e.viajeId),
      // `llegadaNotificadaEn` está filtrado por `gte`, nunca es null aquí.
      detectadoEn: (e.llegadaNotificadaEn as Date).toISOString(),
    }));
  }
}
