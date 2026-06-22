import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  LimiteDiarioError,
  type CalcularOpts,
  type CarreteraProvider,
  type PuntoLatLng,
  type PuntoRuta,
  type RutaCalculada,
} from './route-provider';
import { normalizarGeometria } from './polyline.util';

const TIMEOUT_MS = 8000;
/** Tope diario por defecto (free tier de TomTom = 2500/día por key). */
export const TOPE_DIARIO_DEFAULT = 2000;
/** Decimales de las coords en la URL (defensa en profundidad ante coords no validadas). */
const DECIMALES_URL = 6;
const PROVEEDOR = 'TOMTOM';

// Re-exporta el error compartido para no romper imports existentes (specs, etc.).
export { LimiteDiarioError } from './route-provider';

/**
 * Ruteo por carretera vía TomTom Routing API (calculateRoute). La key es POR
 * CLIENTE (env `TOMTOM_API_KEY`), se usa solo server-side y nunca llega al
 * navegador (ni se loguea: viaja en query string). Tope defensivo de llamadas/día
 * (`TOMTOM_MAX_DIARIO`, default ${TOPE_DIARIO_DEFAULT}; el free tier de TomTom es
 * 2500/día por key) que, al superarse, lanza `LimiteDiarioError` para que el
 * orquestador degrade a geodésica. El contador es best-effort: se siembra desde la
 * BD (filas de hoy en `ruta_cache`) para sobrevivir reinicios el mismo día.
 * `traffic=false` mantiene el resultado estable (cacheable a largo plazo).
 */
@Injectable()
export class TomTomRouteProvider implements CarreteraProvider {
  constructor(private readonly prisma: PrismaService) {}

  readonly proveedor = PROVEEDOR;
  private dia = '';
  private cuenta = 0;

  /** Hay key configurada → el ruteo por carretera está disponible. */
  disponible(): boolean {
    return !!process.env.TOMTOM_API_KEY;
  }

  private get limiteDiario(): number {
    const n = Number(process.env.TOMTOM_MAX_DIARIO);
    return Number.isFinite(n) && n > 0 ? n : TOPE_DIARIO_DEFAULT;
  }

  /**
   * Registra una llamada del día y dice si sigue dentro del tope. Al cambiar de
   * día re-siembra el contador desde la BD (best-effort, sobrevive reinicios).
   */
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

  /** Cuenta las rutas TomTom cacheadas hoy (≈ llamadas reales del día). */
  private async contarLlamadasHoy(dia: string): Promise<number> {
    try {
      return await this.prisma.rutaCache.count({
        where: { proveedor: PROVEEDOR, createdAt: { gte: new Date(`${dia}T00:00:00.000Z`) } },
      });
    } catch {
      return 0;
    }
  }

  async calcular(
    puntos: PuntoRuta[],
    opts?: CalcularOpts,
  ): Promise<RutaCalculada> {
    const key = process.env.TOMTOM_API_KEY;
    if (!key) throw new Error('TOMTOM_API_KEY no configurada');
    if (puntos.length < 2) {
      return { km: 0, tiempoMin: null, metodo: 'RUTA', geometria: null, advertencias: [] };
    }
    if (!(await this.dentroDelTope())) throw new LimiteDiarioError('ruteo TomTom');

    const locs = puntos
      .map((p) => `${p.lat.toFixed(DECIMALES_URL)},${p.lng.toFixed(DECIMALES_URL)}`)
      .join(':');
    // Con departAt (salida futura) usamos tráfico histórico/predicho; si no, flujo
    // libre (estable y cacheable a largo plazo).
    const trafico = opts?.departAt
      ? `&traffic=true&departAt=${encodeURIComponent(opts.departAt)}`
      : '&traffic=false';
    const url =
      `https://api.tomtom.com/routing/1/calculateRoute/${locs}/json` +
      `?key=${encodeURIComponent(key)}&travelMode=truck&routeType=fastest${trafico}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`TomTom HTTP ${res.status}`);
      const data = (await res.json()) as {
        routes?: Array<{
          summary?: { lengthInMeters?: number; travelTimeInSeconds?: number };
          legs?: Array<{
            points?: Array<{ latitude?: number; longitude?: number }>;
          }>;
        }>;
      };
      const route = data?.routes?.[0];
      const sum = route?.summary;
      if (!sum || typeof sum.lengthInMeters !== 'number') {
        throw new Error('TomTom: respuesta sin ruta');
      }

      // Polilínea: concatena los tramos en orden omitiendo el primer punto de cada
      // tramo posterior (coincide con el último del anterior → vértice duplicado).
      const cruda: PuntoLatLng[] = [];
      const legs = route?.legs ?? [];
      for (let i = 0; i < legs.length; i++) {
        const pts = legs[i].points ?? [];
        for (let j = i === 0 ? 0 : 1; j < pts.length; j++) {
          const p = pts[j];
          if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
            cruda.push([p.latitude, p.longitude]);
          }
        }
      }
      const geometria = cruda.length >= 2 ? normalizarGeometria(cruda) : null;

      return {
        km: sum.lengthInMeters / 1000,
        tiempoMin:
          typeof sum.travelTimeInSeconds === 'number'
            ? sum.travelTimeInSeconds / 60
            : null,
        metodo: 'RUTA',
        geometria,
        advertencias: [],
      };
    } finally {
      clearTimeout(t);
    }
  }
}
