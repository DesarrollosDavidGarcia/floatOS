import { TipoDocumentoUnidad } from '@flotaos/shared-types';

/** Datos de entrada para crear una unidad. */
export interface CrearUnidadInput {
  placas: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidadKg?: number;
  aseguradora?: string;
  numeroPoliza?: string;
}

/** Datos de entrada para actualizar una unidad (campos opcionales). */
export type ActualizarUnidadInput = Partial<CrearUnidadInput> & {
  activo?: boolean;
};

/** Parámetros de búsqueda/paginación de unidades. */
export interface ListarUnidadesInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Datos de entrada para crear un documento de unidad.
 * Las fechas llegan como string (ISO) y el caso de uso las convierte a Date.
 */
export interface CrearDocumentoUnidadInput {
  tipo: TipoDocumentoUnidad;
  descripcion?: string;
  fechaEmision?: string;
  fechaVencimiento: string;
  archivoKey?: string;
}

/**
 * Datos de entrada para actualizar un documento de unidad.
 * Las fechas llegan como string (ISO) y el caso de uso las convierte a Date.
 */
export interface ActualizarDocumentoUnidadInput {
  tipo?: TipoDocumentoUnidad;
  descripcion?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoKey?: string;
}
