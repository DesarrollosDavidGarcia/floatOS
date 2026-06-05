import { TipoDocumentoUnidad } from '@flotaos/shared-types';

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
