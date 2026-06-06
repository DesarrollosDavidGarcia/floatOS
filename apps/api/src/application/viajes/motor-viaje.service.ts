import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ResultadoEvaluacion } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  evaluarFlota,
  simularCarga,
  type CompatibilidadFn,
  type UnidadCandidata,
} from '../../domain/viaje/motor-calculo';
import { itemsDeEscalas } from './viaje-escalas.helper';
import type { EscalaInput, EvaluarViajeInput } from './viajes.types';

const dec = (v: Prisma.Decimal | null): number | null =>
  v == null ? null : Number(v);

/**
 * Motor de cálculo a nivel de aplicación: calcula la distancia de la ruta con
 * PostGIS y evalúa la flota contra el itinerario (simulación de carga + reglas
 * de compatibilidad). La lógica pura vive en domain/viaje/motor-calculo.ts.
 */
@Injectable()
export class MotorViajeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Distancia geodésica total (km) sumando los tramos entre escalas consecutivas
   * con coordenadas, vía PostGIS (ST_MakeLine + ST_Length sobre geography).
   */
  async distanciaKm(
    escalas: EscalaInput[],
  ): Promise<{ km: number; advertencias: string[] }> {
    const conCoords = escalas.filter((e) => e.lat != null && e.lng != null);
    const advertencias: string[] = [];
    const sinCoords = escalas.length - conCoords.length;
    if (sinCoords > 0) {
      advertencias.push(
        `${sinCoords} escala(s) sin coordenadas; sus tramos no se contabilizan en la distancia`,
      );
    }
    if (conCoords.length < 2) return { km: 0, advertencias };

    const lats = conCoords.map((e) => e.lat as number);
    const lngs = conCoords.map((e) => e.lng as number);

    const rows = await this.prisma.$queryRaw<Array<{ km: number }>>`
      SELECT COALESCE(ST_Length(ST_MakeLine(p.geom ORDER BY p.ord)::geography), 0) / 1000.0 AS km
      FROM (
        SELECT ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geom, ord
        FROM unnest(${lats}::float8[], ${lngs}::float8[]) WITH ORDINALITY AS t(lat, lng, ord)
      ) p
    `;
    return { km: Number(rows[0]?.km ?? 0), advertencias };
  }

  /** Evalúa el itinerario contra la flota candidata. */
  async evaluar(input: EvaluarViajeInput): Promise<ResultadoEvaluacion> {
    const sim = simularCarga(itemsDeEscalas(input.escalas));
    const { km, advertencias } = await this.distanciaKm(input.escalas);

    const unidades = await this.prisma.unidad.findMany({
      where: {
        activo: true,
        ...(input.unidadIds?.length ? { id: { in: input.unidadIds } } : {}),
      },
      select: {
        id: true,
        placas: true,
        tipo: true,
        capacidadKg: true,
        capacidadM3: true,
        rendimientoKmL: true,
        capacidadTanqueL: true,
      },
    });

    const candidatas: UnidadCandidata[] = unidades.map((u) => {
      const rend = dec(u.rendimientoKmL);
      const tanque = dec(u.capacidadTanqueL);
      return {
        id: u.id,
        placas: u.placas,
        tipo: u.tipo,
        capacidadKg: dec(u.capacidadKg),
        capacidadM3: dec(u.capacidadM3),
        autonomiaKm: rend != null && tanque != null ? rend * tanque : null,
      };
    });

    const { esCompatible, tiposSinReglas } = await this.cargarCompatibilidad(
      sim.tiposCargaPresentes,
    );
    const advertenciasCompat = tiposSinReglas.map(
      (t) =>
        `El tipo de carga "${t}" no tiene reglas de compatibilidad: se acepta en cualquier unidad`,
    );

    return evaluarFlota(sim, km, candidatas, esCompatible, {
      metodoDistancia: 'GEODESICA',
      advertencias: [...advertencias, ...advertenciasCompat],
    });
  }

  /**
   * Carga las reglas de compatibilidad. Semántica de allow-list por tipo de carga:
   * si un tipo de carga tiene al menos una regla, solo se permiten los tipos de
   * unidad listados con permitido=true; si no tiene reglas, se permite en todas.
   */
  private async cargarCompatibilidad(
    tipos: string[],
  ): Promise<{ esCompatible: CompatibilidadFn; tiposSinReglas: string[] }> {
    if (tipos.length === 0) {
      return { esCompatible: () => true, tiposSinReglas: [] };
    }

    const reglas = await this.prisma.compatibilidadCargaUnidad.findMany({
      where: { tipoCarga: { in: tipos } },
    });

    const conReglas = new Set(reglas.map((r) => r.tipoCarga));
    const permitidas = new Map<string, Set<string>>();
    for (const r of reglas) {
      if (!r.permitido) continue;
      if (!permitidas.has(r.tipoCarga)) permitidas.set(r.tipoCarga, new Set());
      permitidas.get(r.tipoCarga)!.add(r.tipoUnidad);
    }

    // Tipos presentes sin ninguna regla configurada (allow-list "fail-open").
    const tiposSinReglas = tipos.filter((t) => !conReglas.has(t));

    const esCompatible: CompatibilidadFn = (tipoCarga, tipoUnidad) =>
      !conReglas.has(tipoCarga) ||
      (permitidas.get(tipoCarga)?.has(tipoUnidad) ?? false);

    return { esCompatible, tiposSinReglas };
  }
}
