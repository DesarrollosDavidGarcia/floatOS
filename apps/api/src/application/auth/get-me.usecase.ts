import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrincipalType } from './auth.service';
import {
  aConductorPublico,
  aUsuarioPublico,
  PrincipalPublico,
} from './auth.types';

/** Caso de uso: devuelve el principal actual sin campos sensibles. */
@Injectable()
export class GetMeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, type: PrincipalType): Promise<PrincipalPublico> {
    if (type === 'admin') {
      const usuario = await this.prisma.usuario.findUnique({ where: { id } });
      if (!usuario) {
        throw new NotFoundException(`Usuario con id ${id} no encontrado`);
      }
      return aUsuarioPublico(usuario);
    }

    const conductor = await this.prisma.conductor.findUnique({ where: { id } });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${id} no encontrado`);
    }
    return { ...aConductorPublico(conductor), type: 'conductor' };
  }
}
