import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  LimiteDiarioError,
  type CalcularOpts,
  type CarreteraProvider,
  type PuntoRuta,
  type RutaCalculada,
} from './route-provider';
import { decodificarPolilinea } from './google-polyline.util';
import { normalizarGeometria } from './polyline.util';

const TIMEOUT_MS = 8000;
/** Tope diario por defecto (defensa contra facturación descontrolada de Google). */
export const TOPE_DIARIO_DEFAULT = 2000;
const PROVEEDOR = 'GOOGLE';
const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
/** Campos mínimos que pedimos (FieldMask es obligatorio en Routes API). */
const FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline';

/** Construye un waypoint de la Routes API a partir de un punto. */
function waypoint(p: PuntoRuta) {
  return { location: { latLng: { latitude: p.lat, longitude: p.lng } } };
}

/** Parsea la duración de Routes API ("8280s") a minutos; null si no viene. */
function duracionAMin(duration?: string | null): number | null {
  if (!duration) return null;
  const seg = Number(String(duration).replace(/s$/, ''));
  return Number.isFinite(seg) ? seg / 60 : null;
}

/**
 * Ruteo por carretera vía Google **Routes API** (`computeRoutes`). La key es POR
 * CLIENTE (env `GOOGLE_MAPS_SERVER_KEY`), se usa solo server-side y viaja en el
 * header `X-Goog-Api-Key` (no en la URL → no se loguea). Tope defensivo de
 * llamadas/día (`GOOGLE_MAPS_MAX_DIARIO`, default ${TOPE_DIARIO_DEFAULT}) que, al
 * superarse, lanza `LimiteDiarioError` para degradar a geodésica; el contador se
 * siembra desde `ruta_cache` (filas GOOGLE de hoy) para sobrevivir reinicios.
 *
 * NOTA: Routes API no tiene perfil de camión (usa `DRIVE`, auto). La distancia y
 * el ETA son de automóvil — ver el plan de migración. Con `departAt` futuro se
 * pide tráfico predicho (`TRAFFIC_AWARE`); sin él, `TRAFFIC_UNAWARE` (estable y
 * cacheable a largo plazo).
 */
@Injectable()
export class GoogleRouteProvider implements CarreteraProvider {
  constructor(private readonly prisma: PrismaService) {}

  readonly proveedor = PROVEEDOR;
  private dia = '';
  private cuenta = 0;

  /** Hay key configurada → el ruteo por carretera está disponible. */
  disponible(): boolean {
    return !!process.env.GOOGLE_MAPS_SERVER_KEY;
  }

  private get limiteDiario(): number {
    const n = Number(process.env.GOOGLE_MAPS_MAX_DIARIO);
    return Number.isFinite(n) && n > 0 ? n : TOPE_DIARIO_DEFAULT;
  }

  /** Registra una llamada del día y dice si sigue dentro del tope. */
  private async dentroDelTope(): Promise<boolean> {
    const hoy = new Date().toISOString().slice(0, 10);
    if (hoy !== this.dia) {
      this.dia = hoy;
      this.cuenta = await this.contarLlamadasHoy(hoy);
    }
    if (this.cuenta >= this.limiteDiario) return false;
    this.cuenta += 1;
    return true;
  }

  /** Cuenta las rutas Google cacheadas hoy (≈ llamadas reales del día). */
  private async contarLlamadasHoy(dia: string): Promise<number> {
    try {
      return await this.prisma.rutaCache.count({
        where: {
          proveedor: PROVEEDOR,
          createdAt: { gte: new Date(`${dia}T00:00:00.000Z`) },
        },
      });
    } catch {
      return 0;
    }
  }

  async calcular(
    puntos: PuntoRuta[],
    opts?: CalcularOpts,
  ): Promise<RutaCalculada> {
    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) throw new Error('GOOGLE_MAPS_SERVER_KEY no configurada');
    if (puntos.length < 2) {
      return { km: 0, tiempoMin: null, metodo: 'RUTA', geometria: null, advertencias: [] };
    }
    if (!(await this.dentroDelTope())) throw new LimiteDiarioError('ruteo Google');

    // Origen, destino e intermedios (escalas entre el primero y el último).
    const origin = waypoint(puntos[0]);
    const destination = waypoint(puntos[puntos.length - 1]);
    const intermediates = puntos.slice(1, -1).map(waypoint);

    // Con departAt futuro: tráfico predicho. Sin él: flujo libre (cacheable).
    const conTrafico = Boolean(opts?.departAt);
    const body: Record<string, unknown> = {
      origin,
      destination,
      travelMode: 'DRIVE',
      routingPreference: conTrafico ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
      polylineQuality: 'HIGH_QUALITY',
      ...(intermediates.length ? { intermediates } : {}),
      ...(conTrafico ? { departureTime: opts!.departAt } : {}),
    };

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
      const data = (await res.json()) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          polyline?: { encodedPolyline?: string };
        }>;
      };
      const route = data?.routes?.[0];
      if (!route || typeof route.distanceMeters !== 'number') {
        throw new Error('Google: respuesta sin ruta');
      }

      const cruda = route.polyline?.encodedPolyline
        ? decodificarPolilinea(route.polyline.encodedPolyline)
        : [];
      const geometria = cruda.length >= 2 ? normalizarGeometria(cruda) : null;

      return {
        km: route.distanceMeters / 1000,
        tiempoMin: duracionAMin(route.duration),
        metodo: 'RUTA',
        geometria,
        advertencias: [],
      };
    } finally {
      clearTimeout(t);
    }
  }
}
