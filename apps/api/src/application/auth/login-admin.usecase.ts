import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthService } from './auth.service';
import { AuthResponse, aUsuarioPublico } from './auth.types';

/** Caso de uso: login del admin con email + password. */
@Injectable()
export class LoginAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute(email: string, password: string): Promise<AuthResponse> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await this.authService.compararPassword(
      password,
      usuario.passwordHash,
    );
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.authService.generarTokens({
      sub: usuario.id,
      type: 'admin',
    });

    const refreshTokenHash = await this.authService.hashRefreshToken(
      tokens.refreshToken,
    );
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshTokenHash },
    });

    return { ...tokens, user: aUsuarioPublico(usuario) };
  }
}
