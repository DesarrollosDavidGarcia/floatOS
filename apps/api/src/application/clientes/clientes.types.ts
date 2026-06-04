/** Datos de entrada para crear un cliente. */
export interface CrearClienteInput {
  razonSocial: string;
  rfc?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  direccion?: string;
}

/** Datos de entrada para actualizar parcialmente un cliente. */
export interface ActualizarClienteInput {
  razonSocial?: string;
  rfc?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  direccion?: string;
}

/** Parámetros de búsqueda y paginación. */
export interface ListarClientesInput {
  q?: string;
  page?: number;
  pageSize?: number;
}
