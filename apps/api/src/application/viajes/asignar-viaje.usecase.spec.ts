import { ConflictException } from '@nestjs/common';
import { EstadoViaje } from '@prisma/client';
import { AsignarViajeUseCase } from './asignar-viaje.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';

/** Construye un PrismaService mock con un viaje actual y stubs de transacción. */
function prismaMock(actual: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const crearHistorial = jest.fn().mockResolvedValue({});
  const tx = {
    viaje: { update: jest.fn().mockResolvedValue({ id: 'v1' }) },
    historialAsignacionViaje: { create: crearHistorial },
  };
  const prisma = {
    viaje: {
      findUnique: jest.fn().mockResolvedValue(actual),
      // asegurarConductorDisponible: null = conductor libre.
      findFirst: jest.fn().mockResolvedValue(null),
    },
    unidad: { findUnique: jest.fn() },
    conductor: { findUnique: jest.fn() },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    ...overrides,
  };
  return { prisma, crearHistorial };
}

function crear(prisma: unknown) {
  const tracking = { emitirReasignacion: jest.fn() } as unknown as TrackingGateway;
  const uc = new AsignarViajeUseCase(prisma as PrismaService, tracking);
  return { uc, tracking };
}

describe('AsignarViajeUseCase', () => {
  it('rechaza reasignar un viaje finalizado (409)', async () => {
    const { prisma } = prismaMock({
      estado: EstadoViaje.FACTURADO,
      folio: 1,
      unidadId: null,
      conductorId: null,
      unidad: null,
      conductor: null,
    });
    const { uc } = crear(prisma);

    await expect(
      uc.execute('v1', { conductorId: 'c2' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registra auditoría y emite WS al cambiar de conductor', async () => {
    const { prisma, crearHistorial } = prismaMock({
      estado: EstadoViaje.EN_TRANSITO,
      folio: 6,
      unidadId: 'u1',
      conductorId: 'c1',
      unidad: { placas: 'ABC-123' },
      conductor: { nombre: 'Laura', apellidos: 'Méndez' },
    });
    prisma.conductor.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'c2', activo: true, nombre: 'Pedro', apellidos: 'Ruiz' });
    const { uc, tracking } = crear(prisma);

    await uc.execute('v1', { conductorId: 'c2', motivo: 'AVERIA', nota: 'varado' }, 'admin-1');

    expect(crearHistorial).toHaveBeenCalledTimes(1);
    const data = crearHistorial.mock.calls[0][0].data;
    expect(data).toMatchObject({
      conductorAnterior: 'Laura Méndez',
      conductorNuevo: 'Pedro Ruiz',
      motivo: 'AVERIA',
      nota: 'varado',
      registradoPor: 'admin-1',
      unidadAnterior: null, // la unidad no cambió
    });
    expect(tracking.emitirReasignacion).toHaveBeenCalledTimes(1);
    const payload = (tracking.emitirReasignacion as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ conductorCambio: true, unidadCambio: false, motivo: 'AVERIA' });
  });

  it('no registra auditoría si reasigna al mismo conductor (sin cambios)', async () => {
    const { prisma, crearHistorial } = prismaMock({
      estado: EstadoViaje.ACEPTADO,
      folio: 6,
      unidadId: 'u1',
      conductorId: 'c1',
      unidad: { placas: 'ABC-123' },
      conductor: { nombre: 'Laura', apellidos: 'Méndez' },
    });
    prisma.conductor.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'c1', activo: true, nombre: 'Laura', apellidos: 'Méndez' });
    const { uc, tracking } = crear(prisma);

    await uc.execute('v1', { conductorId: 'c1' });

    expect(crearHistorial).not.toHaveBeenCalled();
    expect(tracking.emitirReasignacion).not.toHaveBeenCalled();
  });
});
