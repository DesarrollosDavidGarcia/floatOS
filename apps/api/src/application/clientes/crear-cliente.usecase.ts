import { Injectable } from '@nestjs/common';
import { Cliente } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CrearClienteInput } from './clientes.types';

/** Caso de uso: crear un cliente final del transportista. */
@Injectable()
export class CrearClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CrearClienteInput): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: {
        razonSocial: input.razonSocial,
        rfc: input.rfc ?? null,
        contactoNombre: input.contactoNombre ?? null,
        contactoTelefono: input.contactoTelefono ?? null,
        contactoEmail: input.contactoEmail ?? null,
        direccion: input.direccion ?? null,
      },
    });
  }
}
