import { TipoDocumentoUnidad } from '@flotaos/shared-types';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

/** Resultado paginado genérico de la API (contrato único en shared-types). */
export type { Paginado } from '@flotaos/shared-types';

export interface Unidad {
  id: string;
  placas: string;
  tipo: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  capacidadKg?: number | null;
  aseguradora?: string | null;
  numeroPoliza?: string | null;
  activo: boolean;
}

export interface DocumentoUnidad {
  id: string;
  tipo: TipoDocumentoUnidad;
  descripcion?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento: string;
  archivoKey?: string | null;
}

export const TIPO_DOCUMENTO_UNIDAD_LABEL: Record<TipoDocumentoUnidad, string> = {
  [TipoDocumentoUnidad.VERIFICACION]: 'Verificación',
  [TipoDocumentoUnidad.SEGURO]: 'Seguro',
  [TipoDocumentoUnidad.TARJETA_CIRCULACION]: 'Tarjeta de circulación',
  [TipoDocumentoUnidad.OTRO]: 'Otro',
};

export type EstadoVencimiento = 'vencido' | 'por-vencer' | 'vigente';

/** Calcula el estado de un documento según su fecha de vencimiento. */
export function estadoVencimiento(fechaVencimiento: string, diasUmbral = 30): EstadoVencimiento {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);
  const diffDias = Math.floor((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencido';
  if (diffDias <= diasUmbral) return 'por-vencer';
  return 'vigente';
}

export const ESTADO_VENCIMIENTO_LABEL: Record<EstadoVencimiento, string> = {
  vencido: 'Vencido',
  'por-vencer': 'Por vencer',
  vigente: 'Vigente',
};

export const ESTADO_VENCIMIENTO_BADGE: Record<EstadoVencimiento, BadgeVariant> = {
  vencido: 'destructive',
  'por-vencer': 'warning',
  vigente: 'success',
};
