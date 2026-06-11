import type { BadgeVariant } from '@/components/ui/badge';
import type { EstadoCotizacion } from '@/components/cotizaciones/types';

export const ESTADO_COTIZACION_LABEL: Record<EstadoCotizacion, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
};

export const ESTADO_COTIZACION_BADGE: Record<EstadoCotizacion, BadgeVariant> = {
  BORRADOR: 'secondary',
  ENVIADA: 'default',
  ACEPTADA: 'success',
  RECHAZADA: 'destructive',
};

/**
 * Transiciones de estado disponibles desde la UI (espejo del backend en
 * `cotizaciones.service.ts`). No incluye BORRADOR como destino (no se des-envía)
 * ni ENVIADA desde BORRADOR (eso ocurre al enviar el correo).
 */
export const TRANSICIONES_COTIZACION: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR: ['ACEPTADA', 'RECHAZADA'],
  ENVIADA: ['ACEPTADA', 'RECHAZADA'],
  ACEPTADA: ['RECHAZADA', 'ENVIADA'],
  RECHAZADA: ['ACEPTADA', 'ENVIADA'],
};

/** Etiqueta del ítem de menú para mover una cotización a `destino`. */
export const ACCION_ESTADO_LABEL: Record<EstadoCotizacion, string> = {
  BORRADOR: 'Volver a borrador',
  ENVIADA: 'Reabrir (marcar enviada)',
  ACEPTADA: 'Marcar como aceptada',
  RECHAZADA: 'Marcar como rechazada',
};

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** Formatea un monto como moneda MXN. */
export function formatearMoneda(n?: number | string | null): string {
  const v = Number(n);
  return Number.isFinite(v) ? MXN.format(v) : '—';
}
