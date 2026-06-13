import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ActualizarClienteInput, contactosACreate } from './clientes.types';

/** Caso de uso: actualizar parcialmente un cliente (y reemplazar contactos). */
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
    if (input.regimenFiscal !== undefined) data.regimenFiscal = input.regimenFiscal;
    if (input.usoCfdi !== undefined) data.usoCfdi = input.usoCfdi;
    if (input.cpFiscal !== undefined) data.cpFiscal = input.cpFiscal;
    if (input.emailFacturacion !== undefined)
      data.emailFacturacion = input.emailFacturacion;
    if (input.direccion !== undefined) data.direccion = input.direccion;
    // Si llega `contactos`, reemplaza la lista completa (borra y recrea).
    if (input.contactos !== undefined) {
      data.contactos = {
        deleteMany: {},
        create: contactosACreate(input.contactos),
      };
    }

    return this.prisma.cliente.update({
      where: { id },
      data,
      include: { contactos: { orderBy: { orden: 'asc' } } },
    });
  }
}
