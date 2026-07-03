import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SucursalCliente } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';

export interface SucursalClienteInput {
  nombre: string;
  rfc?: string;
  calle?: string;
  numeroExt?: string;
  numeroInt?: string;
  colonia?: string;
  cp?: string;
  municipio?: string;
  estado?: string;
  pais?: string;
  lat?: number;
  lng?: number;
  esPrincipal?: boolean;
  orden?: number;
}

/** Casos de uso de las sucursales (domicilios) de un cliente. */
@Injectable()
export class SucursalesClienteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private async asegurarCliente(clienteId: string): Promise<void> {
    await obtenerOFallar(
      () =>
        this.prisma.cliente.findUnique({
          where: { id: clienteId },
          select: { id: true },
        }),
      `Cliente con id ${clienteId} no encontrado`,
    );
  }

  private async obtener(
    clienteId: string,
    sucursalId: string,
  ): Promise<SucursalCliente> {
    const s = await this.prisma.sucursalCliente.findUnique({
      where: { id: sucursalId },
    });
    if (!s || s.clienteId !== clienteId) {
      throw new NotFoundException(`Sucursal con id ${sucursalId} no encontrada`);
    }
    return s;
  }

  /**
   * Si la sucursal se marca principal, desmarca las demás del cliente. Recibe el
   * cliente transaccional para que el destronar + el alta/edición sean atómicos
   * (evita dejar al cliente sin principal si la escritura posterior falla).
   */
  private destronarPrincipal(
    tx: Prisma.TransactionClient,
    clienteId: string,
    exceptoId?: string,
  ): Promise<unknown> {
    return tx.sucursalCliente.updateMany({
      where: { clienteId, esPrincipal: true, ...(exceptoId ? { id: { not: exceptoId } } : {}) },
      data: { esPrincipal: false },
    });
  }

  async listar(clienteId: string): Promise<SucursalCliente[]> {
    await this.asegurarCliente(clienteId);
    return this.prisma.sucursalCliente.findMany({
      where: { clienteId },
      orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async crear(
    clienteId: string,
    input: SucursalClienteInput,
  ): Promise<SucursalCliente> {
    await this.asegurarCliente(clienteId);
    const t = (v?: string) => (v?.trim() ? v.trim() : null);
    return this.prisma.$transaction(async (tx) => {
      if (input.esPrincipal) await this.destronarPrincipal(tx, clienteId);
      return tx.sucursalCliente.create({
        data: {
          clienteId,
          nombre: input.nombre.trim(),
          rfc: t(input.rfc),
          calle: t(input.calle),
          numeroExt: t(input.numeroExt),
          numeroInt: t(input.numeroInt),
          colonia: t(input.colonia),
          cp: t(input.cp),
          municipio: t(input.municipio),
          estado: t(input.estado),
          pais: input.pais?.trim() || 'México',
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          esPrincipal: input.esPrincipal ?? false,
          orden: input.orden ?? 0,
        },
      });
    });
  }

  async actualizar(
    clienteId: string,
    sucursalId: string,
    input: Partial<SucursalClienteInput>,
  ): Promise<SucursalCliente> {
    await this.obtener(clienteId, sucursalId);
    const t = (v?: string) => (v?.trim() ? v.trim() : null);
    const data: Prisma.SucursalClienteUncheckedUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre.trim();
    if (input.rfc !== undefined) data.rfc = t(input.rfc);
    if (input.calle !== undefined) data.calle = t(input.calle);
    if (input.numeroExt !== undefined) data.numeroExt = t(input.numeroExt);
    if (input.numeroInt !== undefined) data.numeroInt = t(input.numeroInt);
    if (input.colonia !== undefined) data.colonia = t(input.colonia);
    if (input.cp !== undefined) data.cp = t(input.cp);
    if (input.municipio !== undefined) data.municipio = t(input.municipio);
    if (input.estado !== undefined) data.estado = t(input.estado);
    if (input.pais !== undefined) data.pais = input.pais?.trim() || 'México';
    if (input.lat !== undefined) data.lat = input.lat ?? null;
    if (input.lng !== undefined) data.lng = input.lng ?? null;
    if (input.esPrincipal !== undefined) data.esPrincipal = input.esPrincipal;
    if (input.orden !== undefined) data.orden = input.orden;

    return this.prisma.$transaction(async (tx) => {
      if (input.esPrincipal) await this.destronarPrincipal(tx, clienteId, sucursalId);
      return tx.sucursalCliente.update({ where: { id: sucursalId }, data });
    });
  }

  async eliminar(clienteId: string, sucursalId: string): Promise<void> {
    await this.obtener(clienteId, sucursalId);
    await this.prisma.sucursalCliente.delete({ where: { id: sucursalId } });
  }
}
