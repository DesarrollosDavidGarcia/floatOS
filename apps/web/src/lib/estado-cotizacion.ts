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

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** Formatea un monto como moneda MXN. */
export function formatearMoneda(n?: number | string | null): string {
  const v = Number(n);
  return Number.isFinite(v) ? MXN.format(v) : '—';
}
