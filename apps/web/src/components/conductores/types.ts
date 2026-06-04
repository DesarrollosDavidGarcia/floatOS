import type { EstadoViaje } from '@flotaos/shared-types';

/** Conductor tal como lo devuelve la API (nunca incluye passwordHash). */
export interface Conductor {
  id: string;
  nombre: string;
  apellidos: string | null;
  usuario: string;
  email: string | null;
  telefono: string | null;
  fotoKey?: string | null;
  activo: boolean;
  // Datos de RH (catálogos / texto) usados en el listado
  puesto?: string | null;
  categoriaLicencia?: string | null;
  numeroEmpleado?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** Documento asociado a un conductor. */
export interface DocumentoConductor {
  id: string;
  conductorId: string;
  tipo: string; // catálogo TIPO_DOCUMENTO_CONDUCTOR
  numero: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string;
  archivoKey: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Viaje (subconjunto usado en el historial del conductor). */
export interface ViajeConductor {
  id: string;
  folio: number;
  estado: EstadoViaje;
  origenDireccion: string;
  destinoDireccion: string;
  tipoCarga: string;
  fechaProgramada: string | null;
  fechaInicio: string | null;
  fechaEntrega: string | null;
  createdAt: string;
}

/** Payload para crear/editar un conductor. */
export interface ConductorFormPayload {
  nombre: string;
  apellidos?: string;
  usuario: string;
  email?: string;
  telefono?: string;
  password?: string;
}

/** Payload para crear/editar un documento. */
export interface DocumentoFormPayload {
  tipo: string;
  numero?: string;
  fechaEmision?: string;
  fechaVencimiento: string;
}
