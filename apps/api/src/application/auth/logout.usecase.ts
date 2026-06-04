import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrincipalType } from './auth.service';

/** Caso de uso: invalida la sesión borrando el refreshTokenHash del principal. */
@Injectable()
export class LogoutUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, type: PrincipalType): Promise<void> {
    if (type === 'admin') {
      await this.prisma.usuario.updateMany({
        where: { id },
        data: { refreshTokenHash: null },
      });
    } else {
      await this.prisma.conductor.updateMany({
        where: { id },
        data: { refreshTokenHash: null },
      });
    }
  }
}
