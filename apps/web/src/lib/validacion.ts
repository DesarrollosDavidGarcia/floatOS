import { z } from 'zod';

/**
 * Helpers de validación para los formularios del expediente. Todos los inputs
 * llegan como string (react-hook-form + <Input>), por eso los números se
 * validan sobre string. Mensajes en español, consistentes en todo el panel.
 */

/** Texto obligatorio (recortado). */
export const textoRequerido = (msg = 'Este campo es obligatorio') =>
  z.string().trim().min(1, msg);

/** Selección obligatoria (catálogo). */
export const seleccionRequerida = (msg = 'Selecciona una opción') =>
  z.string().min(1, msg);

/** Fecha obligatoria (input date → 'yyyy-MM-dd'). */
export const fechaRequerida = (msg = 'La fecha es obligatoria') =>
  z.string().min(1, msg);

const vacio = (v: string | undefined | null) => v == null || v === '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True si la cadena tiene forma de email válido (chequeo ligero de cliente). */
export function esEmail(valor: string): boolean {
  return EMAIL_RE.test(valor.trim());
}

/** Número opcional con límites opcionales (min/max/entero). */
export const numeroOpcional = (
  opts: { min?: number; max?: number; entero?: boolean } = {},
) => {
  const { min, max, entero } = opts;
  return z
    .string()
    .optional()
    .refine((v) => vacio(v) || !Number.isNaN(Number(v)), 'Debe ser un número')
    .refine(
      (v) => vacio(v) || min === undefined || Number(v) >= min,
      min !== undefined ? `Debe ser mayor o igual a ${min}` : '',
    )
    .refine(
      (v) => vacio(v) || max === undefined || Number(v) <= max,
      max !== undefined ? `Debe ser menor o igual a ${max}` : '',
    )
    .refine(
      (v) => vacio(v) || !entero || Number.isInteger(Number(v)),
      'Debe ser un número entero',
    );
};

/**
 * Valida que una fecha `fin` no sea anterior a una fecha `inicio` (ambas en el
 * objeto). Úsalo en `.superRefine` o `.refine` del schema del formulario:
 *   .refine((d) => finNoAntesDeInicio(d.fechaInicio, d.fechaFin), {
 *     path: ['fechaFin'], message: 'No puede ser anterior a la fecha de inicio',
 *   })
 */
export function finNoAntesDeInicio(
  inicio?: string | null,
  fin?: string | null,
): boolean {
  if (vacio(inicio) || vacio(fin)) return true;
  return new Date(fin as string) >= new Date(inicio as string);
}
