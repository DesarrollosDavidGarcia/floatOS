import { Conductor } from '@prisma/client';

/**
 * Representación pública del Conductor: excluye campos sensibles
 * (passwordHash, refreshTokenHash) antes de enviarlo en cualquier respuesta.
 */
export interface ConductorPublico {
  id: string;
  nombre: string;
  apellidos: string | null;
  usuario: string;
  email: string | null;
  telefono: string | null;
  fotoKey: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Campos de Recursos Humanos
  curp: string | null;
  rfc: string | null;
  nss: string | null;
  fechaNacimiento: Date | null;
  tipoSangre: string | null;
  direccion: string | null;
  numeroEmpleado: string | null;
  puesto: string | null;
  fechaIngreso: Date | null;
  categoriaLicencia: string | null; // catálogo CATEGORIA_LICENCIA
  emergenciaNombre: string | null;
  emergenciaTelefono: string | null;
  emergenciaRelacion: string | null;
  // Contratación (planta / freelance / terciarizado)
  tipoContratacion: string | null; // catálogo TIPO_CONTRATACION
  empresaProveedor: string | null;
  empresaProveedorRfc: string | null;
  proveedorContactoNombre: string | null;
  proveedorContactoTelefono: string | null;
  vigenciaDesde: Date | null;
  vigenciaHasta: Date | null;
  notasContratacion: string | null;
}

/** Resumen del viaje abierto que ocupa a un conductor (chip de disponibilidad). */
export interface ViajeActivoConductor {
  id: string;
  folio: number;
  estado: string;
}

/** Quita passwordHash y refreshTokenHash de un Conductor de Prisma. */
export function aConductorPublico(conductor: Conductor): ConductorPublico {
  const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...resto } =
    conductor;
  return resto;
}
