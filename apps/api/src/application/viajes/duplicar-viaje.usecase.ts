import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CrearViajeUseCase } from './crear-viaje.usecase';
import { CrearViajeInput } from './viajes.types';

/**
 * Caso de uso: duplicar un viaje. Copia el itinerario (escalas + cargas), el
 * cliente, la fecha programada y el plan multi-día, y reutiliza CrearViajeUseCase
 * (recalcula ruta/snapshot, folio/token nuevos, estado inicial, historial). NO
 * copia la asignación de unidad/conductor: el viaje nuevo nace sin asignar.
 */
@Injectable()
export class DuplicarViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crear: CrearViajeUseCase,
  ) {}

  async execute(id: string, registradoPor: string) {
    const origen = await this.prisma.viaje.findUnique({
      where: { id },
      select: {
        clienteId: true,
        fechaProgramada: true,
        planRuta: true,
        escalas: {
          orderBy: { orden: 'asc' },
          select: {
            accion: true,
            direccion: true,
            lat: true,
            lng: true,
            notas: true,
            ventanaDesde: true,
            ventanaHasta: true,
            cargas: {
              select: {
                sentido: true,
                tipoCarga: true,
                descripcion: true,
                pesoKg: true,
                volumenM3: true,
                largoM: true,
                anchoM: true,
                altoM: true,
                cantidad: true,
                loteRef: true,
              },
            },
          },
        },
      },
    });
    if (!origen) throw new NotFoundException(`Viaje con id ${id} no encontrado`);

    const num = (v: Prisma.Decimal | null): number | undefined =>
      v == null ? undefined : Number(v);

    const input: CrearViajeInput = {
      clienteId: origen.clienteId,
      fechaProgramada: origen.fechaProgramada?.toISOString(),
      escalas: origen.escalas.map((e) => ({
        accion: e.accion,
        direccion: e.direccion,
        lat: e.lat ?? undefined,
        lng: e.lng ?? undefined,
        notas: e.notas ?? undefined,
        ventanaDesde: e.ventanaDesde?.toISOString(),
        ventanaHasta: e.ventanaHasta?.toISOString(),
        cargas: e.cargas.map((c) => ({
          sentido: c.sentido,
          tipoCarga: c.tipoCarga,
          descripcion: c.descripcion ?? undefined,
          pesoKg: Number(c.pesoKg),
          volumenM3: num(c.volumenM3),
          largoM: num(c.largoM),
          anchoM: num(c.anchoM),
          altoM: num(c.altoM),
          cantidad: c.cantidad,
          loteRef: c.loteRef ?? undefined,
        })),
      })),
    };

    const nuevo = await this.crear.execute(input, registradoPor);

    // Copia el plan multi-día si el origen lo tenía.
    if (origen.planRuta != null) {
      await this.prisma.viaje.update({
        where: { id: nuevo.id },
        data: { planRuta: origen.planRuta as Prisma.InputJsonValue },
      });
    }

    return nuevo;
  }
}
