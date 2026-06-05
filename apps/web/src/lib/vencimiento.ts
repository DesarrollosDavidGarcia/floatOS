import type { BadgeVariant } from '@/components/ui/badge';

/**
 * Lógica ÚNICA de vencimiento para todo el panel (regla escalonada acordada):
 *   vencido (<0 d)  → rojo
 *   crítico (≤7 d)  → rojo   (incluye "vence hoy")
 *   por vencer (≤30 d) → ámbar
 *   vigente (>30 d) → verde
 * El filtro de "días" del centro de alertas sigue siendo configurable; esta
 * regla solo define cómo se clasifica/colorea cada vencimiento individual.
 */
export type EstadoVencimiento = 'vencido' | 'critico' | 'por-vencer' | 'vigente';

const MS_DIA = 86_400_000;

/** Días enteros (hora local, a medianoche) desde hoy hasta la fecha. <0 = vencido. */
export function diasHasta(fechaIso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fechaIso);
  objetivo.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / MS_DIA);
}

/** Clasifica unos días restantes ya calculados según la regla escalonada. */
export function estadoPorDias(dias: number): EstadoVencimiento {
  if (dias < 0) return 'vencido';
  if (dias <= 7) return 'critico';
  if (dias <= 30) return 'por-vencer';
  return 'vigente';
}

/** Mapa estado → variante de Badge (fuente única de colores). */
export const ESTADO_VENCIMIENTO_VARIANT: Record<EstadoVencimiento, BadgeVariant> = {
  vencido: 'destructive',
  critico: 'destructive',
  'por-vencer': 'warning',
  vigente: 'success',
};

/** Variante de Badge para unos días restantes. */
export function variantePorDias(dias: number): BadgeVariant {
  return ESTADO_VENCIMIENTO_VARIANT[estadoPorDias(dias)];
}

/** Etiqueta corta del estado (sin número). */
export const ESTADO_VENCIMIENTO_LABEL: Record<EstadoVencimiento, string> = {
  vencido: 'Vencido',
  critico: 'Crítico',
  'por-vencer': 'Por vencer',
  vigente: 'Vigente',
};

const plural = (n: number) => (n === 1 ? 'día' : 'días');

/** Texto detallado con el conteo de días ("Vencido hace 3 días", "Vence hoy", "Vence en 12 días"). */
export function etiquetaDias(dias: number): string {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} ${plural(Math.abs(dias))}`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} ${plural(dias)}`;
}

export interface VencimientoInfo {
  /** Días restantes (negativo si ya venció). */
  dias: number;
  estado: EstadoVencimiento;
  variant: BadgeVariant;
  /** Texto detallado con el conteo (ver etiquetaDias). */
  label: string;
}

/** Info completa de vencimiento a partir de una fecha ISO. */
export function vencimientoInfo(fechaIso: string): VencimientoInfo {
  const dias = diasHasta(fechaIso);
  const estado = estadoPorDias(dias);
  return {
    dias,
    estado,
    variant: ESTADO_VENCIMIENTO_VARIANT[estado],
    label: etiquetaDias(dias),
  };
}
