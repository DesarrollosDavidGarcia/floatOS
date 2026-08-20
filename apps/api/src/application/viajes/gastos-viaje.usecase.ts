import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GastoViaje } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';

export interface CrearGastoInput {
  /** Catálogo TIPO_GASTO: COMBUSTIBLE, CASETA, VIATICOS, OTRO. */
  tipo: string;
  monto: number;
  descripcion?: string;
  /** Solo combustible: litros y precio del ticket, para el costo real. */
  litros?: number;
  precioPorLitro?: number;
}

/** Gasto con la URL temporal del ticket, listo para mostrarse. */
export interface GastoVista extends Omit<GastoViaje, 'fotoTicketKey'> {
  fotoTicketUrl: string | null;
}

/**
 * Gastos del viaje capturados en campo (combustible, casetas, viáticos).
 *
 * Se pueden registrar en cualquier momento del viaje y no solo al cerrarlo: una
 * caseta ocurre a media ruta y obligar a recordarlas todas al final es pedir que
 * se inventen. El ticket es lo que convierte el combustible de estimado a real
 * en el cálculo del margen.
 */
@Injectable()
export class GastosViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async aVista(g: GastoViaje): Promise<GastoVista> {
    const { fotoTicketKey, ...resto } = g;
    return {
      ...resto,
      fotoTicketUrl: fotoTicketKey
        ? await this.storage.urlVisualizacion(fotoTicketKey)
        : null,
    };
  }

  /** Comprueba que el viaje existe y, si hay conductor, que sea el suyo. */
  private async asegurarViaje(viajeId: string, conductorId?: string) {
    const viaje = await obtenerOFallar(
      () =>
        this.prisma.viaje.findUnique({
          where: { id: viajeId },
          select: { id: true, conductorId: true },
        }),
      `Viaje con id ${viajeId} no encontrado`,
    );
    if (conductorId && viaje.conductorId !== conductorId) {
      throw new ForbiddenException('Este viaje no está asignado a usted');
    }
    return viaje;
  }

  async listar(viajeId: string, conductorId?: string): Promise<GastoVista[]> {
    await this.asegurarViaje(viajeId, conductorId);
    const filas = await this.prisma.gastoViaje.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(filas.map((g) => this.aVista(g)));
  }

  async crear(
    viajeId: string,
    input: CrearGastoInput,
    conductorId?: string,
  ): Promise<GastoVista> {
    await this.asegurarViaje(viajeId, conductorId);
    if (input.monto <= 0) {
      throw new BadRequestException('El monto del gasto debe ser mayor a 0');
    }
    const creado = await this.prisma.gastoViaje.create({
      data: {
        viajeId,
        tipo: input.tipo,
        monto: input.monto,
        descripcion: input.descripcion ?? null,
        litros: input.litros ?? null,
        precioPorLitro: input.precioPorLitro ?? null,
      },
    });
    return this.aVista(creado);
  }

  /** Adjunta (o reemplaza) la foto del ticket. */
  async guardarTicket(
    gastoId: string,
    archivo: { buffer: Buffer; mimetype: string; originalname: string },
    conductorId?: string,
  ): Promise<GastoVista> {
    const gasto = await obtenerOFallar(
      () =>
        this.prisma.gastoViaje.findUnique({
          where: { id: gastoId },
          include: { viaje: { select: { conductorId: true } } },
        }),
      `Gasto con id ${gastoId} no encontrado`,
    );
    if (conductorId && gasto.viaje.conductorId !== conductorId) {
      throw new ForbiddenException('Este gasto no es de un viaje suyo');
    }

    const key = this.storage.generarKey(
      `viajes/${gasto.viajeId}/tickets`,
      archivo.originalname,
    );
    await this.storage.subir(key, archivo.buffer, archivo.mimetype);
    const actualizado = await this.prisma.gastoViaje.update({
      where: { id: gastoId },
      data: { fotoTicketKey: key },
    });
    // El ticket anterior se borra después de subir el nuevo: al revés, un fallo
    // de subida dejaría el gasto sin comprobante ninguno.
    if (gasto.fotoTicketKey) {
      await this.storage.eliminar(gasto.fotoTicketKey).catch(() => undefined);
    }
    return this.aVista(actualizado);
  }

  async eliminar(
    gastoId: string,
    conductorId?: string,
  ): Promise<{ id: string }> {
    const gasto = await obtenerOFallar(
      () =>
        this.prisma.gastoViaje.findUnique({
          where: { id: gastoId },
          include: { viaje: { select: { conductorId: true } } },
        }),
      `Gasto con id ${gastoId} no encontrado`,
    );
    if (conductorId && gasto.viaje.conductorId !== conductorId) {
      throw new ForbiddenException('Este gasto no es de un viaje suyo');
    }
    await this.prisma.gastoViaje.delete({ where: { id: gastoId } });
    if (gasto.fotoTicketKey) {
      await this.storage.eliminar(gasto.fotoTicketKey).catch(() => undefined);
    }
    return { id: gastoId };
  }
}
