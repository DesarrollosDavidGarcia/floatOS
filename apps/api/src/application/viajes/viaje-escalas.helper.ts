import { Prisma } from '@prisma/client';
import type { CargaSimulada, ItemCargaEval } from '../../domain/viaje/motor-calculo';
import type { CargaInput, EscalaInput } from './viajes.types';

/** Volumen efectivo de una carga: usa volumenM3 directo o lo deriva de las dimensiones × cantidad. */
export function volumenEfectivo(c: CargaInput): number {
  if (c.volumenM3 != null) return c.volumenM3;
  if (c.largoM != null && c.anchoM != null && c.altoM != null) {
    return c.largoM * c.anchoM * c.altoM * (c.cantidad ?? 1);
  }
  return 0;
}

/** Aplana las escalas en items para el motor de cálculo (orden = índice de escala). */
export function itemsDeEscalas(escalas: EscalaInput[]): ItemCargaEval[] {
  const items: ItemCargaEval[] = [];
  escalas.forEach((escala, orden) => {
    for (const c of escala.cargas ?? []) {
      items.push({
        escalaOrden: orden,
        sentido: c.sentido === 'DESCARGA' ? 'DESCARGA' : 'CARGA',
        tipoCarga: c.tipoCarga,
        pesoKg: c.pesoKg,
        volumenM3: volumenEfectivo(c),
      });
    }
  });
  return items;
}

/**
 * Resumen denormalizado que se guarda en Viaje (origen/destino/carga + snapshot).
 * En servicio de PERSONAL los campos de carga se anulan (no aplican); el
 * origen/destino se siguen derivando de las paradas.
 */
export function derivarResumen(
  escalas: EscalaInput[],
  sim: CargaSimulada,
  esPersonal = false,
) {
  const primera = escalas[0];
  const ultima = escalas[escalas.length - 1];
  const primeraCarga = esPersonal
    ? undefined
    : escalas.flatMap((e) => e.cargas ?? []).find((c) => c.sentido !== 'DESCARGA');

  return {
    origenDireccion: primera.direccion,
    origenLat: primera.lat ?? null,
    origenLng: primera.lng ?? null,
    destinoDireccion: ultima.direccion,
    destinoLat: ultima.lat ?? null,
    destinoLng: ultima.lng ?? null,
    tipoCarga: esPersonal ? null : (primeraCarga?.tipoCarga ?? 'GENERAL'),
    descripcionCarga: esPersonal ? null : (primeraCarga?.descripcion ?? null),
    pesoKg: esPersonal ? null : sim.pesoMaxKg,
    pesoMaxKg: esPersonal ? null : sim.pesoMaxKg,
    volumenMaxM3: esPersonal ? null : sim.volumenMaxM3,
  };
}

/** Resultado del motor de cálculo de ruta que se vuelca al snapshot del viaje. */
interface ResultadoRuta {
  km: number;
  tiempoMin: number | null;
  geometria: [number, number][] | null;
}

/**
 * Campos snapshot de ruta para el create/update del Viaje. Centraliza el mapeo
 * (geometría ausente → JsonNull) usado por crear y editar. La geometría ya viene
 * simplificada/redondeada desde el proveedor de ruteo.
 */
export function snapshotRuta(ruta: ResultadoRuta): {
  distanciaEstimadaKm: number;
  tiempoEstimadoMin: number | null;
  rutaGeometria: Prisma.InputJsonValue | typeof Prisma.JsonNull;
} {
  return {
    distanciaEstimadaKm: ruta.km,
    tiempoEstimadoMin: ruta.tiempoMin,
    rutaGeometria: ruta.geometria ?? Prisma.JsonNull,
  };
}

/** Construye el `create` anidado de escalas (+ cargas) para Prisma. */
export function nestedEscalasCreate(
  escalas: EscalaInput[],
): Prisma.EscalaViajeCreateWithoutViajeInput[] {
  return escalas.map((e, orden) => ({
    orden,
    accion: e.accion,
    direccion: e.direccion,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    notas: e.notas ?? null,
    ventanaDesde: e.ventanaDesde ? new Date(e.ventanaDesde) : null,
    ventanaHasta: e.ventanaHasta ? new Date(e.ventanaHasta) : null,
    cargas: {
      create: (e.cargas ?? []).map((c) => ({
        sentido: c.sentido,
        tipoCarga: c.tipoCarga,
        descripcion: c.descripcion ?? null,
        pesoKg: c.pesoKg,
        volumenM3: c.volumenM3 ?? null,
        largoM: c.largoM ?? null,
        anchoM: c.anchoM ?? null,
        altoM: c.altoM ?? null,
        cantidad: c.cantidad ?? 1,
        loteRef: c.loteRef ?? null,
      })),
    },
  }));
}
