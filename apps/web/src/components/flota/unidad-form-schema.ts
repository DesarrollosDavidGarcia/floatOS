import { z } from 'zod';
import { textoRequerido, seleccionRequerida, numeroOpcional } from '@/lib/validacion';
import type { Unidad } from './types';

/**
 * Validación y mapeo del formulario de unidad. Vive aparte porque lo comparten
 * el alta rápida (modal) y la ficha completa: si cada uno tuviera su copia,
 * acabarían aceptando cosas distintas.
 */
export const unidadSchema = z.object({
  placas: textoRequerido('Las placas son obligatorias'),
  tipo: seleccionRequerida('Selecciona el tipo de unidad'),
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  anio: numeroOpcional({ min: 1950, max: 2100, entero: true }),
  capacidadKg: numeroOpcional({ min: 0 }),
  capacidadM3: numeroOpcional({ min: 0 }),
  rendimientoKmL: numeroOpcional({ min: 0 }),
  capacidadTanqueL: numeroOpcional({ min: 0 }),
  capacidadPasajeros: numeroOpcional({ min: 0, entero: true }),
  costoFijoMensual: numeroOpcional({ min: 0 }),
  aseguradora: z.string().trim().optional(),
  numeroPoliza: z.string().trim().optional(),
});

export type UnidadFormValues = z.infer<typeof unidadSchema>;

const texto = (v?: number | string | null): string => (v == null ? '' : String(v));

export function unidadADefaults(unidad?: Unidad | null): UnidadFormValues {
  return {
    placas: unidad?.placas ?? '',
    tipo: unidad?.tipo ?? '',
    marca: unidad?.marca ?? '',
    modelo: unidad?.modelo ?? '',
    anio: texto(unidad?.anio),
    capacidadKg: texto(unidad?.capacidadKg),
    capacidadM3: texto(unidad?.capacidadM3),
    rendimientoKmL: texto(unidad?.rendimientoKmL),
    capacidadTanqueL: texto(unidad?.capacidadTanqueL),
    capacidadPasajeros: texto(unidad?.capacidadPasajeros),
    costoFijoMensual: texto(unidad?.costoFijoMensual),
    aseguradora: unidad?.aseguradora ?? '',
    numeroPoliza: unidad?.numeroPoliza ?? '',
  };
}

/** Vacío se manda como undefined: el API lo interpreta como "sin cambio". */
export function unidadAPayload(values: UnidadFormValues) {
  const num = (v?: string) => (v ? Number(v) : undefined);
  return {
    placas: values.placas,
    tipo: values.tipo,
    marca: values.marca || undefined,
    modelo: values.modelo || undefined,
    anio: num(values.anio),
    capacidadKg: num(values.capacidadKg),
    capacidadM3: num(values.capacidadM3),
    rendimientoKmL: num(values.rendimientoKmL),
    capacidadTanqueL: num(values.capacidadTanqueL),
    capacidadPasajeros: num(values.capacidadPasajeros),
    costoFijoMensual: num(values.costoFijoMensual),
    aseguradora: values.aseguradora || undefined,
    numeroPoliza: values.numeroPoliza || undefined,
  };
}
