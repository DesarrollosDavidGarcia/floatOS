import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/** Coordenada geográfica resultado de geocodificar una dirección. */
export interface Coordenada {
  lat: number;
  lng: number;
  /** Dirección formateada que Google reconoció (para mostrarla al usuario). */
  direccionFormateada: string;
}

/**
 * Geocodificación server-side (dirección de texto → lat/lng) usando la
 * Geocoding API de Google. Reúsa `GOOGLE_MAPS_SERVER_KEY` (la misma key del
 * ruteo; debe tener habilitada la *Geocoding API* en Google Cloud).
 *
 * Pensado para el bot: el usuario escribe "CDMX" / "Monterrey" y obtenemos las
 * coordenadas que el motor de ruteo necesita.
 */
/** Timeout de la llamada a Google (igual que el provider de ruteo). */
const TIMEOUT_MS = 8000;
/** Tope diario de geocodificaciones por defecto (defensa anti-facturación). */
const TOPE_DIARIO_DEFAULT = 2000;

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  // Contador diario en memoria (defensa best-effort; un reinicio lo resetea,
  // pero el @Throttle del BotController acota el abuso de forma persistente).
  private dia = '';
  private cuenta = 0;

  get disponible(): boolean {
    return Boolean(process.env.GOOGLE_MAPS_SERVER_KEY);
  }

  private get limiteDiario(): number {
    const n = Number(process.env.GOOGLE_MAPS_GEOCODE_MAX_DIARIO);
    return Number.isFinite(n) && n > 0 ? n : TOPE_DIARIO_DEFAULT;
  }

  /** Registra una geocodificación del día y dice si sigue dentro del tope. */
  private dentroDelTope(): boolean {
    const hoy = new Date().toISOString().slice(0, 10);
    if (hoy !== this.dia) {
      this.dia = hoy;
      this.cuenta = 0;
    }
    if (this.cuenta >= this.limiteDiario) return false;
    this.cuenta += 1;
    return true;
  }

  async geocodificar(direccion: string): Promise<Coordenada> {
    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
      throw new ServiceUnavailableException(
        'La geocodificación no está configurada (falta GOOGLE_MAPS_SERVER_KEY).',
      );
    }
    const texto = direccion.trim();
    if (!texto) {
      throw new BadRequestException('La dirección no puede estar vacía.');
    }

    if (!this.dentroDelTope()) {
      this.logger.warn(
        `Tope diario de geocodificación alcanzado (${this.limiteDiario}); se rechaza la petición.`,
      );
      throw new ServiceUnavailableException(
        'Se alcanzó el límite diario de geocodificación. Intenta más tarde.',
      );
    }

    const url =
      'https://maps.googleapis.com/maps/api/geocode/json' +
      `?address=${encodeURIComponent(texto)}&region=mx&language=es&key=${key}`;

    let json: GoogleGeocodeRespuesta;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      json = (await res.json()) as GoogleGeocodeRespuesta;
    } catch (error) {
      this.logger.error(
        `Fallo al llamar a Google Geocoding: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'El servicio de geocodificación no está disponible en este momento.',
      );
    } finally {
      clearTimeout(t);
    }

    if (json.status === 'ZERO_RESULTS' || !json.results?.length) {
      throw new BadRequestException(
        `No se pudo ubicar la dirección: "${texto}".`,
      );
    }
    if (json.status !== 'OK') {
      this.logger.warn(`Geocoding devolvió estado ${json.status}.`);
      throw new ServiceUnavailableException(
        'No se pudo geocodificar la dirección en este momento.',
      );
    }

    const r = json.results[0];
    return {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      direccionFormateada: r.formatted_address ?? texto,
    };
  }
}

interface GoogleGeocodeRespuesta {
  status: string;
  results?: Array<{
    formatted_address?: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
}
