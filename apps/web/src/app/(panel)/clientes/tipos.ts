export interface ContactoCliente {
  id?: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  esPrincipal?: boolean;
  orden?: number;
}

export interface Cliente {
  id: string;
  razonSocial: string;
  rfc?: string | null;
  // Datos fiscales (CFDI 4.0) — códigos de catálogo SAT.
  regimenFiscal?: string | null;
  usoCfdi?: string | null;
  cpFiscal?: string | null;
  emailFacturacion?: string | null;
  direccion?: string | null;
  contactos?: ContactoCliente[];
  createdAt: string;
}

// Contrato único de paginación: reexportado desde shared-types para no divergir.
export type { Paginado } from '@flotaos/shared-types';
