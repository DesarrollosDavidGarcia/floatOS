import { TipoDocumentoUnidad } from '@flotaos/shared-types';
import {
  diasHasta,
  estadoPorDias,
  ESTADO_VENCIMIENTO_VARIANT,
} from '@/lib/vencimiento';

/** Resultado paginado genérico de la API (contrato único en shared-types). */
export type { Paginado } from '@flotaos/shared-types';

/** Estado y etiquetas de vencimiento: regla escalonada única (lib/vencimiento). */
export type { EstadoVencimiento } from '@/lib/vencimiento';
export { ESTADO_VENCIMIENTO_LABEL } from '@/lib/vencimiento';

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

/** Mapa estado → variante de Badge (alias del canónico para los consumidores de flota). */
export const ESTADO_VENCIMIENTO_BADGE = ESTADO_VENCIMIENTO_VARIANT;

/** Estado de vencimiento de un documento de unidad (regla escalonada única). */
export function estadoVencimiento(fechaVencimiento: string) {
  return estadoPorDias(diasHasta(fechaVencimiento));
}
