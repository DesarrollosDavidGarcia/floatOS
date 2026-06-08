import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { PuntoRuta, RouteProvider, RutaCalculada } from './route-provider';

/**
 * Distancia geodésica (línea recta sobre el elipsoide) sumando los tramos entre
 * puntos consecutivos vía PostGIS (ST_MakeLine + ST_Length sobre geography).
 * Es el proveedor por defecto y el fallback cuando TomTom no está disponible.
 */
@Injectable()
export class GeodesicaRouteProvider implements RouteProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcular(puntos: PuntoRuta[]): Promise<RutaCalculada> {
    if (puntos.length < 2) {
      return {
        km: 0,
        tiempoMin: null,
        metodo: 'GEODESICA',
        geometria: null,
        advertencias: [],
      };
    }
    const lats = puntos.map((p) => p.lat);
    const lngs = puntos.map((p) => p.lng);
    const rows = await this.prisma.$queryRaw<Array<{ km: number }>>`
      SELECT COALESCE(ST_Length(ST_MakeLine(p.geom ORDER BY p.ord)::geography), 0) / 1000.0 AS km
      FROM (
        SELECT ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geom, ord
        FROM unnest(${lats}::float8[], ${lngs}::float8[]) WITH ORDINALITY AS t(lat, lng, ord)
      ) p
    `;
    return {
      km: Number(rows[0]?.km ?? 0),
      tiempoMin: null,
      metodo: 'GEODESICA',
      // Sin geometría: el mapa une las escalas con líneas rectas como fallback.
      geometria: null,
      advertencias: [],
    };
  }
}
