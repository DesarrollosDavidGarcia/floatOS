import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../infrastructure/shared/password.service';

export type PrincipalType = 'admin' | 'conductor';

export type RolUsuario = 'ADMIN' | 'MONITORISTA';

export interface JwtPayload {
  sub: string;
  type: PrincipalType;
  /** Solo presente para admins (type === 'admin'). */
  rol?: RolUsuario;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Servicio de aplicación con la lógica criptográfica de tokens:
 * firma/verificación de JWT y hashing del refresh token (vía PasswordService).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {
    // Fail-fast: si falta configuración de JWT, abortamos en el arranque.
    if (!process.env.JWT_SECRET) {
      throw new Error('La variable de entorno JWT_SECRET no está configurada');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        'La variable de entorno JWT_REFRESH_SECRET no está configurada',
      );
    }
    if (!Number.isInteger(Number(process.env.JWT_ACCESS_TTL))) {
      throw new Error(
        'La variable de entorno JWT_ACCESS_TTL debe ser un entero válido',
      );
    }
    if (!Number.isInteger(Number(process.env.JWT_REFRESH_TTL))) {
      throw new Error(
        'La variable de entorno JWT_REFRESH_TTL debe ser un entero válido',
      );
    }
  }

  /** Firma el par access + refresh para un principal dado. */
  async generarTokens(payload: JwtPayload): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: Number(process.env.JWT_ACCESS_TTL),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: Number(process.env.JWT_REFRESH_TTL),
    });
    return { accessToken, refreshToken };
  }

  /** Verifica la firma y expiración de un refresh token. */
  async verificarRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }

  /** Hashea el refresh token para persistirlo (pre-hash SHA-256 + bcrypt). */
  hashRefreshToken(token: string): Promise<string> {
    return this.passwordService.hashToken(token);
  }

  /** Compara un refresh token contra su hash almacenado. */
  compararRefreshToken(token: string, hash: string): Promise<boolean> {
    return this.passwordService.compareToken(token, hash);
  }

  /** Compara una contraseña en claro contra su hash bcrypt. */
  compararPassword(password: string, hash: string): Promise<boolean> {
    return this.passwordService.compare(password, hash);
  }
}
