import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ActualizarClienteInput } from './clientes.types';

/** Caso de uso: actualizar parcialmente un cliente. */
@Injectable()
export class ActualizarClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    input: ActualizarClienteInput,
  ): Promise<Cliente> {
    const existe = await this.prisma.cliente.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    const data: Prisma.ClienteUpdateInput = {};
    if (input.razonSocial !== undefined) data.razonSocial = input.razonSocial;
    if (input.rfc !== undefined) data.rfc = input.rfc;
    if (input.contactoNombre !== undefined)
      data.contactoNombre = input.contactoNombre;
    if (input.contactoTelefono !== undefined)
      data.contactoTelefono = input.contactoTelefono;
    if (input.contactoEmail !== undefined)
      data.contactoEmail = input.contactoEmail;
    if (input.direccion !== undefined) data.direccion = input.direccion;

    return this.prisma.cliente.update({ where: { id }, data });
  }
}
