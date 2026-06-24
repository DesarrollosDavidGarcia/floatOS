import { Injectable } from '@nestjs/common';
import { Cliente, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';
import { asignarDefinidos } from '../shared/asignar-definidos';
import { ActualizarClienteInput, contactosACreate } from './clientes.types';

/** Caso de uso: actualizar parcialmente un cliente (y reemplazar contactos). */
@Injectable()
export class ActualizarClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    input: ActualizarClienteInput,
  ): Promise<Cliente> {
    await obtenerOFallar(
      () => this.prisma.cliente.findUnique({ where: { id } }),
      `Cliente con id ${id} no encontrado`,
    );

    const data: Prisma.ClienteUpdateInput = asignarDefinidos(input, [
      'razonSocial',
      'rfc',
      'regimenFiscal',
      'usoCfdi',
      'cpFiscal',
      'emailFacturacion',
      'direccion',
    ]);
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
