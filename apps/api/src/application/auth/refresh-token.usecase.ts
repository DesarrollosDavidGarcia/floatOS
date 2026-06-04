import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Conductor, Usuario } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthService, JwtPayload, PrincipalType } from './auth.service';
import {
  aConductorPublico,
  AuthResponse,
  aUsuarioPublico,
  PrincipalPublico,
} from './auth.types';

/** Caso de uso: rota el par de tokens a partir de un refresh token válido. */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.authService.verificarRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    return this.rotar(payload.type, payload.sub, refreshToken);
  }

  /**
   * Flujo común de rotación, parametrizado por tipo de principal.
   * Carga la entidad, valida estado + hash del refresh, firma un nuevo par,
   * persiste el nuevo hash y devuelve la vista pública correspondiente.
   */
  private async rotar(
    type: PrincipalType,
    id: string,
    refreshToken: string,
  ): Promise<AuthResponse> {
    const entidad =
      type === 'admin'
        ? await this.prisma.usuario.findUnique({ where: { id } })
        : await this.prisma.conductor.findUnique({ where: { id } });

    if (!entidad || !entidad.activo || !entidad.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const coincide = await this.authService.compararRefreshToken(
      refreshToken,
      entidad.refreshTokenHash,
    );
    if (!coincide) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokens = await this.authService.generarTokens({
      sub: entidad.id,
      type,
    });
    const refreshTokenHash = await this.authService.hashRefreshToken(
      tokens.refreshToken,
    );

    if (type === 'admin') {
      await this.prisma.usuario.update({
        where: { id: entidad.id },
        data: { refreshTokenHash },
      });
    } else {
      await this.prisma.conductor.update({
        where: { id: entidad.id },
        data: { refreshTokenHash },
      });
    }

    const user: PrincipalPublico =
      type === 'admin'
        ? aUsuarioPublico(entidad as Usuario)
        : { ...aConductorPublico(entidad as Conductor), type: 'conductor' };

    return { ...tokens, user };
  }
}
