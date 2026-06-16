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

/** Datos de entrada para crear una caja / remolque. */
export interface CrearCajaInput {
  placas: string;
  tipo: string;
  marca?: string;
  anio?: number;
  capacidadKg?: number;
  capacidadM3?: number;
  aseguradora?: string;
  numeroPoliza?: string;
}

/** Datos de entrada para actualizar una caja (campos opcionales). */
export type ActualizarCajaInput = Partial<CrearCajaInput> & {
  activo?: boolean;
};

/** Parámetros de búsqueda/paginación de cajas. */
export interface ListarCajasInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Datos de entrada para crear un documento de unidad.
 * Las fechas llegan como string (ISO) y el caso de uso las convierte a Date.
 */
export interface CrearDocumentoUnidadInput {
  tipo: string;
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
  tipo?: string;
  descripcion?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoKey?: string;
}
