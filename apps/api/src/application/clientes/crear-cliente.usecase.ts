import { Injectable } from '@nestjs/common';
import { Cliente } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { contactosACreate, CrearClienteInput } from './clientes.types';

/** Caso de uso: crear un cliente final del transportista (con sus contactos). */
@Injectable()
export class CrearClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CrearClienteInput): Promise<Cliente> {
    return this.prisma.cliente.create({
      data: {
        razonSocial: input.razonSocial,
        rfc: input.rfc ?? null,
        regimenFiscal: input.regimenFiscal ?? null,
        usoCfdi: input.usoCfdi ?? null,
        cpFiscal: input.cpFiscal ?? null,
        emailFacturacion: input.emailFacturacion ?? null,
        direccion: input.direccion ?? null,
        contactos: { create: contactosACreate(input.contactos) },
      },
      include: { contactos: { orderBy: { orden: 'asc' } } },
    });
  }
}
