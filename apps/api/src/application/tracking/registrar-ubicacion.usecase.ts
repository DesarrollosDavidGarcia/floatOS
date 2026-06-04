import { Injectable, NotFoundException } from '@nestjs/common';
import { WS_EVENTS } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  RADIO_GEOCERCA_METROS,
  dentroDeGeocerca,
} from '../../infrastructure/realtime/geo.util';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import {
  PuntoUbicacion,
  TipoAlertaGeocerca,
  UbicacionPublica,
} from './tracking.types';

/**
 * Caso de uso: ingesta de ubicaciones del conductor.
 * Guarda los puntos en UbicacionConductor, los reemite a la sala del viaje
 * y evalúa geocercas de llegada (origen/destino) para emitir alertas.
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
   * atómica (createManyAndReturn). Las geocercas se evalúan en memoria sobre los
   * puntos creados; el WS sólo reemite el más reciente por capturadoEn para no
   * saturar al monitorista.
   */
  async executeBatch(
    viajeId: string,
    conductorId: string,
    puntos: PuntoUbicacion[],
  ): Promise<UbicacionPublica[]> {
    // Validamos que el viaje exista y que pertenezca al conductor autenticado.
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: {
        id: true,
        conductorId: true,
        origenLat: true,
        origenLng: true,
        destinoLat: true,
        destinoLng: true,
      },
    });

    if (!viaje) {
      throw new NotFoundException('Viaje no encontrado');
    }
    if (viaje.conductorId !== conductorId) {
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

    // Geocercas: evaluación en memoria sobre cada punto. Sólo notifica.
    for (const publica of guardadas) {
      this.evaluarGeocercas(viaje, publica);
    }

    // Reemite por WS la ubicación más reciente (mayor capturadoEn).
    const masReciente = guardadas.reduce((acc, u) =>
      u.capturadoEn.getTime() > acc.capturadoEn.getTime() ? u : acc,
    );
    this.gateway.emitirUbicacion(viajeId, masReciente);

    return guardadas;
  }

  private evaluarGeocercas(
    viaje: {
      id: string;
      origenLat: number | null;
      origenLng: number | null;
      destinoLat: number | null;
      destinoLng: number | null;
    },
    ubicacion: UbicacionPublica,
  ): void {
    if (
      viaje.origenLat !== null &&
      viaje.origenLng !== null &&
      dentroDeGeocerca(
        ubicacion.lat,
        ubicacion.lng,
        viaje.origenLat,
        viaje.origenLng,
      )
    ) {
      this.emitirAlerta(viaje.id, 'llegada_origen', ubicacion);
    }

    if (
      viaje.destinoLat !== null &&
      viaje.destinoLng !== null &&
      dentroDeGeocerca(
        ubicacion.lat,
        ubicacion.lng,
        viaje.destinoLat,
        viaje.destinoLng,
      )
    ) {
      this.emitirAlerta(viaje.id, 'llegada_destino', ubicacion);
    }
  }

  private emitirAlerta(
    viajeId: string,
    tipo: TipoAlertaGeocerca,
    ubicacion: UbicacionPublica,
  ): void {
    this.gateway.emitirAlerta(viajeId, {
      tipo,
      evento: WS_EVENTS.ALERTA,
      radioMetros: RADIO_GEOCERCA_METROS,
      viajeId,
      ubicacion,
      detectadoEn: new Date(),
    });
  }
}
