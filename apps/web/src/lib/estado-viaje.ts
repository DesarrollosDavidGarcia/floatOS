import { EstadoViaje } from '@flotaos/shared-types';
import type { BadgeVariant } from '@/components/ui/badge';

export const ESTADO_VIAJE_LABEL: Record<EstadoViaje, string> = {
  [EstadoViaje.ASIGNADO]: 'Asignado',
  [EstadoViaje.ACEPTADO]: 'Aceptado',
  [EstadoViaje.EN_CAMINO_ORIGEN]: 'En camino al origen',
  [EstadoViaje.CARGANDO]: 'Cargando',
  [EstadoViaje.EN_TRANSITO]: 'En tránsito',
  [EstadoViaje.ENTREGADO]: 'Entregado',
  [EstadoViaje.FACTURADO]: 'Facturado',
  [EstadoViaje.CANCELADO]: 'Cancelado',
};

export const ESTADO_VIAJE_BADGE: Record<EstadoViaje, BadgeVariant> = {
  [EstadoViaje.ASIGNADO]: 'secondary',
  [EstadoViaje.ACEPTADO]: 'default',
  [EstadoViaje.EN_CAMINO_ORIGEN]: 'warning',
  [EstadoViaje.CARGANDO]: 'warning',
  [EstadoViaje.EN_TRANSITO]: 'warning',
  [EstadoViaje.ENTREGADO]: 'success',
  [EstadoViaje.FACTURADO]: 'success',
  [EstadoViaje.CANCELADO]: 'destructive',
};

/** Estados que cuentan como "viaje activo" (en curso). */
export const ESTADOS_ACTIVOS: EstadoViaje[] = [
  EstadoViaje.ACEPTADO,
  EstadoViaje.EN_CAMINO_ORIGEN,
  EstadoViaje.CARGANDO,
  EstadoViaje.EN_TRANSITO,
];
