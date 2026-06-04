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
}

/** Quita passwordHash y refreshTokenHash de un Conductor de Prisma. */
export function aConductorPublico(conductor: Conductor): ConductorPublico {
  const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...resto } =
    conductor;
  return resto;
}
