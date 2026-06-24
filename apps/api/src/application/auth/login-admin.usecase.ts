import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthService } from './auth.service';
import { AuthResponse, aUsuarioPublico } from './auth.types';

/**
 * Hash bcrypt válido precomputado (coste 10, el mismo que usa el sistema) contra
 * el que comparamos cuando el usuario no existe o está inactivo. Igualar el coste
 * de bcrypt mantiene constante la latencia de respuesta y cierra el side-channel
 * de timing que permitiría enumerar emails. No corresponde a ninguna contraseña
 * real (es el hash de un valor aleatorio descartado).
 */
const DUMMY_PASSWORD_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWG';

/** Caso de uso: login del admin con email + password. */
@Injectable()
export class LoginAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async execute(email: string, password: string): Promise<AuthResponse> {
    // Normalizamos a minúsculas: el email se almacena en minúsculas al crear el
    // usuario, así el login es insensible a mayúsculas.
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!usuario || !usuario.activo) {
      // Ejecutamos igualmente una comparación bcrypt contra un hash dummy para
      // que el tiempo de respuesta sea equivalente al de un email válido y no se
      // pueda enumerar usuarios por la diferencia de latencia. El resultado se
      // ignora; siempre lanzamos el mismo error genérico.
      await this.authService.compararPassword(password, DUMMY_PASSWORD_HASH);
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
      rol: usuario.rol,
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
