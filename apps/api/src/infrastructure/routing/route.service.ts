import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GeodesicaRouteProvider } from './geodesica.provider';
import { LimiteDiarioError, TomTomRouteProvider } from './tomtom.provider';
import {
  claveRuta,
  esGeometria,
  type PuntoRuta,
  type RutaCalculada,
} from './route-provider';

const PROVEEDOR = 'TOMTOM';
/** Antigüedad a partir de la cual se purgan entradas de caché. */
const RETENCION_DIAS = 180;

/** Opciones de cálculo de ruta. */
export interface OpcionesRuta {
  /** Fuerza geodésica local (no consulta ni puebla caché ni llama a TomTom). */
  preferGeodesica?: boolean;
  /**
   * Hora de salida programada (ISO). Si es futura, el ruteo usa tráfico
   * histórico/predicho de TomTom para esa franja (la clave de caché se segmenta
   * por hora). Fechas pasadas o ausentes → flujo libre.
   */
  departAt?: string | null;
}

/** Normaliza departAt a ISO solo si es una fecha válida y futura; si no, null. */
function departAtValido(x?: string | null): string | null {
  if (!x) return null;
  const d = new Date(x);
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null;
  return d.toISOString();
}

/**
 * Orquesta el cálculo de rutas. Con key de TomTom: intenta ruta por carretera con
 * caché persistente (tabla `ruta_cache`, keyed por coordenadas ordenadas) para no
 * repetir llamadas; ante fallo o tope diario degrada a distancia geodésica. Sin
 * key —o con `preferGeodesica` (evaluación en vivo del formulario)— va directo a
 * geodésica (cálculo local PostGIS, barato, sin gastar cuota de TomTom).
 */
@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);
  private ultimaPurga = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tomtom: TomTomRouteProvider,
    private readonly geodesica: GeodesicaRouteProvider,
  ) {}

  async calcular(
    puntos: PuntoRuta[],
    opts?: OpcionesRuta,
  ): Promise<RutaCalculada> {
    if (puntos.length < 2) {
      return {
        km: 0,
        tiempoMin: null,
        metodo: 'GEODESICA',
        geometria: null,
        advertencias: [],
      };
    }
    // La evaluación en vivo (cada cambio del formulario) usa geodésica: no quema
    // cuota de TomTom ni puebla la caché con rutas efímeras de edición.
    if (opts?.preferGeodesica || !this.tomtom.disponible()) {
      return this.geodesica.calcular(puntos);
    }

    void this.purgarSiTocaHoy();

    // Tráfico predicho por franja horaria: segmenta la clave por hora de salida
    // (rutas de horas distintas no colisionan; misma hora comparte caché).
    const departAt = departAtValido(opts?.departAt);
    const perfil = departAt ? `${PROVEEDOR}|t=${departAt.slice(0, 13)}` : PROVEEDOR;
    const clave = claveRuta(puntos, perfil);

    const hit = await this.prisma.rutaCache.findUnique({ where: { clave } }).catch(
      (e: unknown) => {
        this.logger.warn(`Lectura de caché falló: ${(e as Error)?.message}`);
        return null;
      },
    );
    if (hit) {
      return {
        km: hit.distanciaKm,
        tiempoMin: hit.tiempoMin ?? null,
        metodo: 'RUTA',
        geometria: esGeometria(hit.geometria) ? hit.geometria : null,
        advertencias: [],
      };
    }

    try {
      const ruta = await this.tomtom.calcular(puntos, { departAt });
      await this.persistir(clave, ruta);
      return ruta;
    } catch (e) {
      const motivo =
        e instanceof LimiteDiarioError
          ? 'Se alcanzó el tope diario de ruteo; distancia estimada en línea recta'
          : 'No se pudo calcular la ruta por carretera; distancia estimada en línea recta';
      this.logger.warn(`Fallback a geodésica (${(e as Error)?.message})`);
      const geo = await this.geodesica.calcular(puntos);
      return { ...geo, advertencias: [...geo.advertencias, motivo] };
    }
  }

  /** Persiste una ruta en caché; P2002 (carrera entre lotes) es esperado. */
  private async persistir(clave: string, ruta: RutaCalculada): Promise<void> {
    try {
      await this.prisma.rutaCache.create({
        data: {
          clave,
          distanciaKm: ruta.km,
          tiempoMin: ruta.tiempoMin,
          geometria: ruta.geometria ?? Prisma.JsonNull,
          proveedor: PROVEEDOR,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        this.logger.debug('Caché ya poblada por una llamada concurrente (P2002).');
        return;
      }
      this.logger.warn(`No se pudo cachear la ruta: ${(e as Error)?.message}`);
    }
  }

  /** Dispara la poda como máximo una vez por día-proceso (fire-and-forget). */
  private async purgarSiTocaHoy(): Promise<void> {
    const hoy = new Date().toISOString().slice(0, 10);
    if (hoy === this.ultimaPurga) return;
    this.ultimaPurga = hoy;
    await this.purgarAntiguas().catch((e: unknown) =>
      this.logger.warn(`Poda de caché falló: ${(e as Error)?.message}`),
    );
  }

  /** Borra entradas de caché más antiguas que `dias` (evita crecimiento ilimitado). */
  async purgarAntiguas(dias = RETENCION_DIAS): Promise<number> {
    const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.rutaCache.deleteMany({
      where: { createdAt: { lt: limite } },
    });
    if (count > 0) this.logger.log(`Caché de rutas: ${count} entradas purgadas.`);
    return count;
  }
}
