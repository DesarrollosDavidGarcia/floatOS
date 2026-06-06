import { Injectable, NotFoundException } from '@nestjs/common';
import { WS_EVENTS } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RADIO_GEOCERCA_METROS } from '../../infrastructure/realtime/geo.util';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import {
  EscalaCercana,
  PuntoUbicacion,
  UbicacionPublica,
} from './tracking.types';

/**
 * Caso de uso: ingesta de ubicaciones del conductor.
 * Guarda los puntos en UbicacionConductor, los reemite a la sala del viaje y
 * evalúa geocercas de llegada a cualquier ESCALA del itinerario usando PostGIS
 * (ST_DWithin sobre la columna geography indexada con GIST).
 */
@Injectable()
export class RegistrarUbicacionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
  ) {}

  /** Registra un único punto. */
  async execute(
    viajeId: string,
    conductorId: string,
    punto: PuntoUbicacion,
  ): Promise<UbicacionPublica> {
    const [resultado] = await this.executeBatch(viajeId, conductorId, [punto]);
    return resultado;
  }

  /**
   * Registra un lote de puntos (sincronización offline) en una sola operación
   * atómica (createManyAndReturn). El WS sólo reemite el más reciente por
   * capturadoEn; las geocercas se evalúan sobre ese punto (PostGIS).
   */
  async executeBatch(
    viajeId: string,
    conductorId: string,
    puntos: PuntoUbicacion[],
  ): Promise<UbicacionPublica[]> {
    // Validamos que el viaje exista y que pertenezca al conductor autenticado.
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: { id: true, conductorId: true },
    });

    if (!viaje || viaje.conductorId !== conductorId) {
      throw new NotFoundException('Viaje no encontrado');
    }

    // Inserción atómica de todos los puntos en una sola llamada (Prisma 6).
    const registros = await this.prisma.ubicacionConductor.createManyAndReturn({
      data: puntos.map((punto) => ({
        viajeId,
        conductorId,
        lat: punto.lat,
        lng: punto.lng,
        velocidad: punto.velocidad ?? null,
        rumbo: punto.rumbo ?? null,
        precision: punto.precision ?? null,
        capturadoEn: new Date(punto.capturadoEn),
      })),
    });

    const guardadas: UbicacionPublica[] = registros.map((registro) => ({
      id: registro.id,
      viajeId: registro.viajeId,
      lat: registro.lat,
      lng: registro.lng,
      velocidad: registro.velocidad,
      rumbo: registro.rumbo,
      precision: registro.precision,
      capturadoEn: registro.capturadoEn,
      createdAt: registro.createdAt,
    }));

    // Reemite por WS la ubicación más reciente (mayor capturadoEn).
    const masReciente = guardadas.reduce((acc, u) =>
      u.capturadoEn.getTime() > acc.capturadoEn.getTime() ? u : acc,
    );
    this.gateway.emitirUbicacion(viajeId, masReciente);

    // Geocercas por escala (PostGIS) sobre TODOS los puntos del lote, para no
    // perder llegadas ocurridas durante la sincronización offline.
    await this.evaluarGeocercas(viajeId, guardadas, masReciente);

    return guardadas;
  }

  /**
   * Busca, vía PostGIS, las escalas del viaje dentro del radio de geocerca de
   * CUALQUIER punto del lote y emite `llegada_escala` (una por escala, sin
   * duplicar dentro del lote). Aprovecha el índice GIST sobre `escalas_viaje.ubicacion`.
   * Nota: aún no hay estado persistido de "ya llegó", así que lotes distintos
   * pueden reemitir si el conductor sigue dentro del radio (follow-up).
   */
  private async evaluarGeocercas(
    viajeId: string,
    puntos: UbicacionPublica[],
    ubicacionAlerta: UbicacionPublica,
  ): Promise<void> {
    const lats = puntos.map((p) => p.lat);
    const lngs = puntos.map((p) => p.lng);

    // Solo escalas dentro del radio que AÚN no han sido notificadas (dedup entre lotes).
    const cercanas = await this.prisma.$queryRaw<EscalaCercana[]>`
      SELECT DISTINCT e."id", e."orden", e."accion"
      FROM "escalas_viaje" e
      WHERE e."viajeId" = ${viajeId}
        AND e."ubicacion" IS NOT NULL
        AND e."llegadaNotificadaEn" IS NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(${lats}::float8[], ${lngs}::float8[]) AS p(lat, lng)
          WHERE ST_DWithin(
            e."ubicacion",
            ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
            ${RADIO_GEOCERCA_METROS}
          )
        )
      ORDER BY e."orden"
    `;

    if (cercanas.length === 0) return;

    // Marca las escalas como notificadas para no reemitir en lotes posteriores.
    await this.prisma.escalaViaje.updateMany({
      where: { id: { in: cercanas.map((e) => e.id) } },
      data: { llegadaNotificadaEn: new Date() },
    });

    for (const escala of cercanas) {
      this.gateway.emitirAlerta(viajeId, {
        tipo: 'llegada_escala',
        evento: WS_EVENTS.ALERTA,
        radioMetros: RADIO_GEOCERCA_METROS,
        viajeId,
        escalaOrden: escala.orden,
        escalaAccion: escala.accion,
        ubicacion: ubicacionAlerta,
        detectadoEn: new Date(),
      });
    }
  }
}
