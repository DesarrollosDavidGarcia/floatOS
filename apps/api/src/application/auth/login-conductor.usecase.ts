import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthService } from './auth.service';
import { AuthResponse, aConductorPublico } from './auth.types';

/** Caso de uso: login del conductor con campo 'usuario' + password. */
@Injectable()
export class LoginConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute(usuario: string, password: string): Promise<AuthResponse> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { usuario },
    });
    if (!conductor || !conductor.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await this.authService.compararPassword(
      password,
      conductor.passwordHash,
    );
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.authService.generarTokens({
      sub: conductor.id,
      type: 'conductor',
    });

    const refreshTokenHash = await this.authService.hashRefreshToken(
      tokens.refreshToken,
    );
    await this.prisma.conductor.update({
      where: { id: conductor.id },
      data: { refreshTokenHash },
    });

    return {
      ...tokens,
      user: { ...aConductorPublico(conductor), type: 'conductor' },
    };
  }
}
