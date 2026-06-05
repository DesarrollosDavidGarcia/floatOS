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

// Contrato único de paginación: reexportado desde shared-types para no divergir.
export type { Paginado } from '@flotaos/shared-types';
