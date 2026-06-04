import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PasswordService } from '../../infrastructure/shared/password.service';
import {
  aConductorPublico,
  ConductorPublico,
} from './conductores.types';

export interface ActualizarConductorInput {
  nombre?: string;
  apellidos?: string;
  usuario?: string;
  email?: string;
  telefono?: string;
  password?: string;
  activo?: boolean;
}

/** Caso de uso: actualizar datos del conductor (re-hashea password si llega). */
@Injectable()
export class ActualizarConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(
    id: string,
    input: ActualizarConductorInput,
  ): Promise<ConductorPublico> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id },
    });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${id} no encontrado`);
    }

    if (input.usuario && input.usuario !== conductor.usuario) {
      const existente = await this.prisma.conductor.findUnique({
        where: { usuario: input.usuario },
      });
      if (existente) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
    }

    if (input.email && input.email !== conductor.email) {
      const conEmail = await this.prisma.conductor.findUnique({
        where: { email: input.email },
      });
      if (conEmail) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    const data: Prisma.ConductorUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.apellidos !== undefined) data.apellidos = input.apellidos;
    if (input.usuario !== undefined) data.usuario = input.usuario;
    if (input.email !== undefined) data.email = input.email;
    if (input.telefono !== undefined) data.telefono = input.telefono;
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.password !== undefined) {
      data.passwordHash = await this.passwordService.hash(input.password);
    }

    const actualizado = await this.prisma.conductor.update({
      where: { id },
      data,
    });

    return aConductorPublico(actualizado);
  }
}
