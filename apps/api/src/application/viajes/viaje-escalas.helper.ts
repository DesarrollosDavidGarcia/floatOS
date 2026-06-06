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

/** Resumen denormalizado que se guarda en Viaje (origen/destino/carga + snapshot). */
export function derivarResumen(escalas: EscalaInput[], sim: CargaSimulada) {
  const primera = escalas[0];
  const ultima = escalas[escalas.length - 1];
  const primeraCarga = escalas
    .flatMap((e) => e.cargas ?? [])
    .find((c) => c.sentido !== 'DESCARGA');

  return {
    origenDireccion: primera.direccion,
    origenLat: primera.lat ?? null,
    origenLng: primera.lng ?? null,
    destinoDireccion: ultima.direccion,
    destinoLat: ultima.lat ?? null,
    destinoLng: ultima.lng ?? null,
    tipoCarga: primeraCarga?.tipoCarga ?? 'GENERAL',
    descripcionCarga: primeraCarga?.descripcion ?? null,
    pesoKg: sim.pesoMaxKg,
    pesoMaxKg: sim.pesoMaxKg,
    volumenMaxM3: sim.volumenMaxM3,
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
