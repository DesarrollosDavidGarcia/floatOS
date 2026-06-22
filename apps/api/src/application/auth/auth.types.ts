import { Usuario } from '@prisma/client';
import {
  aConductorPublico,
  ConductorPublico,
} from '../conductores/conductores.types';

/** Vista pública de un admin (Usuario) sin campos sensibles. */
export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: Usuario['rol'];
  activo: boolean;
  type: 'admin';
}

/** Mapea un Usuario de Prisma a su vista pública (sin passwordHash/refreshTokenHash). */
export function aUsuarioPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
    type: 'admin',
  };
}

/** Vista pública de un conductor (helper canónico) etiquetada con type. */
export type ConductorPublicoAuth = ConductorPublico & { type: 'conductor' };

/** Reexporta el helper canónico para uso interno del módulo auth. */
export { aConductorPublico };

export type PrincipalPublico = UsuarioPublico | ConductorPublicoAuth;

/** Respuesta estándar de login y refresh. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: PrincipalPublico;
}
