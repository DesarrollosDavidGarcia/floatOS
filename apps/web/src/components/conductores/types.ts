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
  // Datos personales / RH (expediente)
  curp?: string | null;
  rfc?: string | null;
  nss?: string | null;
  fechaNacimiento?: string | null;
  tipoSangre?: string | null;
  direccion?: string | null;
  numeroEmpleado?: string | null;
  puesto?: string | null;
  fechaIngreso?: string | null;
  categoriaLicencia?: string | null;
  emergenciaNombre?: string | null;
  emergenciaTelefono?: string | null;
  emergenciaRelacion?: string | null;
  // Contratación (planta / freelance / terciarizado)
  tipoContratacion?: string | null; // catálogo TIPO_CONTRATACION
  empresaProveedor?: string | null;
  empresaProveedorRfc?: string | null;
  proveedorContactoNombre?: string | null;
  proveedorContactoTelefono?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  notasContratacion?: string | null;
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
  createdAt: string;
  updatedAt: string;
  /** Conteo de archivos adjuntos (lo incluye el listado). */
  _count?: { archivos: number };
}

/** Archivo (PDF o imagen) adjunto a un documento del conductor. */
export interface ArchivoDocumento {
  id: string;
  documentoId: string;
  nombre: string;
  contentType: string;
  tamanoBytes: number;
  createdAt: string;
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
  // Contratación
  tipoContratacion?: string;
  empresaProveedor?: string;
  empresaProveedorRfc?: string;
  proveedorContactoNombre?: string;
  proveedorContactoTelefono?: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  notasContratacion?: string;
  // Datos personales / RH
  curp?: string;
  rfc?: string;
  nss?: string;
  fechaNacimiento?: string;
  tipoSangre?: string;
  direccion?: string;
  numeroEmpleado?: string;
  puesto?: string;
  fechaIngreso?: string;
  categoriaLicencia?: string;
  emergenciaNombre?: string;
  emergenciaTelefono?: string;
  emergenciaRelacion?: string;
}

/** Payload para crear/editar un documento. */
export interface DocumentoFormPayload {
  tipo: string;
  numero?: string;
  fechaEmision?: string;
  fechaVencimiento: string;
}
