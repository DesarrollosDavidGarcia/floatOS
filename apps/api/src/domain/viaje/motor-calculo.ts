import type {
  MetodoDistancia,
  MotivoVeredicto,
  ResultadoEvaluacion,
  VeredictoUnidad,
} from '@flotaos/shared-types';

/**
 * Motor de cálculo (TS puro, sin Nest/Prisma) para determinar el uso adecuado de
 * la unidad. La distancia de la ruta se calcula fuera (PostGIS) y se inyecta.
 */

/** Un movimiento de carga (recoger/entregar) en una escala del itinerario. */
export interface ItemCargaEval {
  escalaOrden: number;
  sentido: 'CARGA' | 'DESCARGA';
  tipoCarga: string;
  pesoKg: number;
  volumenM3: number;
}

/** Unidad candidata con sus capacidades (autonomía ya derivada). */
export interface UnidadCandidata {
  id: string;
  placas?: string;
  tipo: string;
  capacidadKg: number | null;
  capacidadM3: number | null;
  autonomiaKm: number | null;
}

/** ¿La unidad de tipo `tipoUnidad` puede transportar `tipoCarga`? */
export type CompatibilidadFn = (tipoCarga: string, tipoUnidad: string) => boolean;

export interface CargaSimulada {
  /** Peso máximo transportado en cualquier tramo. */
  pesoMaxKg: number;
  /** Volumen máximo transportado en cualquier tramo. */
  volumenMaxM3: number;
  /** Tipos de carga distintos que se transportan en algún momento. */
  tiposCargaPresentes: string[];
}

const redondea = (n: number, dec = 2): number => {
  const f = 10 ** dec;
  return Math.round(n * f) / f;
};

/**
 * Simula la carga acumulada recorriendo las escalas en orden: en cada escala se
 * descarga primero y se carga después; el peso/volumen "en ruta" de un tramo es
 * el acumulado tras completar la escala. Devuelve los máximos sobre todos los tramos.
 */
export function simularCarga(items: ItemCargaEval[]): CargaSimulada {
  const ordenado = [...items].sort((a, b) => a.escalaOrden - b.escalaOrden);
  const ordenes = [...new Set(ordenado.map((i) => i.escalaOrden))].sort(
    (a, b) => a - b,
  );

  let peso = 0;
  let volumen = 0;
  let pesoMax = 0;
  let volumenMax = 0;
  const tipos = new Set<string>();

  for (const orden of ordenes) {
    const enEscala = ordenado.filter((i) => i.escalaOrden === orden);
    // Descargas primero, cargas después (refleja la operación real en la parada).
    for (const it of enEscala.filter((i) => i.sentido === 'DESCARGA')) {
      peso -= it.pesoKg;
      volumen -= it.volumenM3;
    }
    for (const it of enEscala.filter((i) => i.sentido === 'CARGA')) {
      peso += it.pesoKg;
      volumen += it.volumenM3;
      if (it.tipoCarga) tipos.add(it.tipoCarga);
    }
    if (peso > pesoMax) pesoMax = peso;
    if (volumen > volumenMax) volumenMax = volumen;
  }

  return {
    pesoMaxKg: redondea(Math.max(0, pesoMax)),
    volumenMaxM3: redondea(Math.max(0, volumenMax), 3),
    tiposCargaPresentes: [...tipos],
  };
}

/** Evalúa una unidad contra la carga simulada y la distancia. */
export function evaluarUnidad(
  carga: CargaSimulada,
  distanciaKm: number,
  unidad: UnidadCandidata,
  esCompatible: CompatibilidadFn,
): VeredictoUnidad {
  const motivos: MotivoVeredicto[] = [];

  // Peso (check principal). Sin capacidadKg no se puede validar → DATOS_INCOMPLETOS.
  let usoPesoPct: number | undefined;
  if (unidad.capacidadKg != null && unidad.capacidadKg > 0) {
    usoPesoPct = redondea((carga.pesoMaxKg / unidad.capacidadKg) * 100);
    if (carga.pesoMaxKg > unidad.capacidadKg) {
      motivos.push({
        codigo: 'SOBREPESO',
        mensaje: `Carga máxima ${carga.pesoMaxKg} kg excede la capacidad ${unidad.capacidadKg} kg`,
        requerido: carga.pesoMaxKg,
        disponible: unidad.capacidadKg,
      });
    }
  } else {
    motivos.push({
      codigo: 'DATOS_INCOMPLETOS',
      mensaje: 'La unidad no tiene capacidad de peso configurada',
    });
  }

  // Volumen (secundario): solo se valida si la unidad lo tiene configurado.
  let usoVolumenPct: number | undefined;
  if (unidad.capacidadM3 != null && unidad.capacidadM3 > 0) {
    usoVolumenPct = redondea((carga.volumenMaxM3 / unidad.capacidadM3) * 100);
    if (carga.volumenMaxM3 > unidad.capacidadM3) {
      motivos.push({
        codigo: 'SOBRE_VOLUMEN',
        mensaje: `Volumen máximo ${carga.volumenMaxM3} m³ excede la capacidad ${unidad.capacidadM3} m³`,
        requerido: carga.volumenMaxM3,
        disponible: unidad.capacidadM3,
      });
    }
  }

  // Compatibilidad tipo de carga ↔ tipo de unidad.
  const incompatibles = carga.tiposCargaPresentes.filter(
    (t) => !esCompatible(t, unidad.tipo),
  );
  if (incompatibles.length > 0) {
    motivos.push({
      codigo: 'TIPO_INCOMPATIBLE',
      mensaje: `La unidad (${unidad.tipo}) no es compatible con: ${incompatibles.join(', ')}`,
    });
  }

  // Autonomía (secundario): solo si la unidad la tiene configurada.
  let usoAutonomiaPct: number | undefined;
  if (unidad.autonomiaKm != null && unidad.autonomiaKm > 0) {
    usoAutonomiaPct = redondea((distanciaKm / unidad.autonomiaKm) * 100);
    if (distanciaKm > unidad.autonomiaKm) {
      motivos.push({
        codigo: 'AUTONOMIA_INSUFICIENTE',
        mensaje: `La distancia ${redondea(distanciaKm)} km supera la autonomía ${unidad.autonomiaKm} km`,
        requerido: redondea(distanciaKm),
        disponible: unidad.autonomiaKm,
      });
    }
  }

  // DATOS_INCOMPLETOS no bloquea; el resto sí.
  const apta = !motivos.some((m) => m.codigo !== 'DATOS_INCOMPLETOS');

  return {
    unidadId: unidad.id,
    placas: unidad.placas,
    apta,
    motivos,
    usoPesoPct,
    usoVolumenPct,
    usoAutonomiaPct,
  };
}

/**
 * Evalúa toda la flota candidata y ordena: aptas primero y, entre ellas, mejor
 * ajuste primero (mayor uso de peso sin excederse = unidad más justa). Las que no
 * tienen datos para medir el ajuste van al final de las aptas.
 */
export function evaluarFlota(
  carga: CargaSimulada,
  distanciaKm: number,
  unidades: UnidadCandidata[],
  esCompatible: CompatibilidadFn,
  resumenExtra: { metodoDistancia: MetodoDistancia; advertencias: string[] },
): ResultadoEvaluacion {
  const veredictos = unidades
    .map((u) => evaluarUnidad(carga, distanciaKm, u, esCompatible))
    .sort((a, b) => {
      if (a.apta !== b.apta) return a.apta ? -1 : 1;
      // Mejor ajuste = mayor uso de peso (más cercano a 100 sin pasarse).
      const ua = a.usoPesoPct ?? -1;
      const ub = b.usoPesoPct ?? -1;
      return ub - ua;
    });

  const recomendada = veredictos.find((v) => v.apta)?.unidadId;

  return {
    resumen: {
      pesoMaxKg: carga.pesoMaxKg,
      volumenMaxM3: carga.volumenMaxM3,
      distanciaTotalKm: redondea(distanciaKm),
      metodoDistancia: resumenExtra.metodoDistancia,
      advertencias: resumenExtra.advertencias,
      tiposCargaPresentes: carga.tiposCargaPresentes,
    },
    veredictos,
    recomendada,
  };
}
