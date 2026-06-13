/** Un contacto del cliente (lista). */
export interface ContactoClienteInput {
  nombre: string;
  email?: string;
  telefono?: string;
  esPrincipal?: boolean;
}

/** Datos de entrada para crear un cliente. */
export interface CrearClienteInput {
  razonSocial: string;
  rfc?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  cpFiscal?: string;
  emailFacturacion?: string;
  direccion?: string;
  contactos?: ContactoClienteInput[];
}

/** Datos de entrada para actualizar parcialmente un cliente. */
export interface ActualizarClienteInput {
  razonSocial?: string;
  rfc?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  cpFiscal?: string;
  emailFacturacion?: string;
  direccion?: string;
  /** Si viene, reemplaza la lista completa de contactos. */
  contactos?: ContactoClienteInput[];
}

/** Parámetros de búsqueda y paginación. */
export interface ListarClientesInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Normaliza la lista de contactos para persistir: asigna `orden` por posición y
 * garantiza un único principal (el primero marcado; si ninguno, el primero de la
 * lista). Devuelve el shape para `contactos.create` de Prisma.
 */
export function contactosACreate(contactos?: ContactoClienteInput[]) {
  const lista = contactos ?? [];
  const idxPrincipal = lista.findIndex((c) => c.esPrincipal);
  const principal = idxPrincipal === -1 ? 0 : idxPrincipal;
  return lista.map((c, i) => ({
    nombre: c.nombre.trim(),
    email: c.email?.trim() || null,
    telefono: c.telefono?.trim() || null,
    esPrincipal: i === principal,
    orden: i,
  }));
}
