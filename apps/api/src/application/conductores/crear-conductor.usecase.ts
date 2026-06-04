import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PasswordService } from '../../infrastructure/shared/password.service';
import {
  aConductorPublico,
  ConductorPublico,
} from './conductores.types';

export interface CrearConductorInput {
  nombre: string;
  apellidos?: string;
  usuario: string;
  email?: string;
  telefono?: string;
  password: string;
}

/** Caso de uso: el admin crea un conductor con credenciales para la app. */
@Injectable()
export class CrearConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: CrearConductorInput): Promise<ConductorPublico> {
    const existente = await this.prisma.conductor.findUnique({
      where: { usuario: input.usuario },
    });
    if (existente) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    if (input.email) {
      const conEmail = await this.prisma.conductor.findUnique({
        where: { email: input.email },
      });
      if (conEmail) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const conductor = await this.prisma.conductor.create({
      data: {
        nombre: input.nombre,
        apellidos: input.apellidos ?? null,
        usuario: input.usuario,
        email: input.email ?? null,
        telefono: input.telefono ?? null,
        passwordHash,
      },
    });

    return aConductorPublico(conductor);
  }
}
