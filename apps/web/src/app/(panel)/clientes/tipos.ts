export interface Cliente {
  id: string;
  razonSocial: string;
  rfc?: string | null;
  contactoNombre?: string | null;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
  direccion?: string | null;
  createdAt: string;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPaginas: number;
}
