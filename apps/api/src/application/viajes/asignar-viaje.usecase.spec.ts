import { ConflictException } from '@nestjs/common';
import { EstadoViaje } from '@prisma/client';
import { AsignarViajeUseCase } from './asignar-viaje.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';

/**
 * Construye un PrismaService mock con un viaje actual y stubs de transacción.
 * `txActual` permite que la re-lectura dentro de la transacción devuelva algo
 * distinto de la lectura previa (simula una carrera entre ambas).
 */
function prismaMock(
  actual: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
  txActual: Record<string, unknown> = actual,
) {
  const crearHistorial = jest.fn().mockResolvedValue({});
  const tx = {
    viaje: {
      update: jest.fn().mockResolvedValue({ id: 'v1' }),
      findUnique: jest.fn().mockResolvedValue(txActual),
      // asegurar*Disponible dentro de la transacción: null = recurso libre.
      findFirst: jest.fn().mockResolvedValue(null),
    },
    historialAsignacionViaje: { create: crearHistorial },
    // bloquearViaje: una fila = el viaje sigue existiendo.
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'v1' }]),
  };
  const prisma = {
    viaje: {
      findUnique: jest.fn().mockResolvedValue(actual),
      // asegurarConductorDisponible: null = conductor libre.
      findFirst: jest.fn().mockResolvedValue(null),
    },
    unidad: { findUnique: jest.fn() },
    caja: { findUnique: jest.fn() },
    conductor: { findUnique: jest.fn() },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    ...overrides,
  };
  return { prisma, tx, crearHistorial };
}

function crear(prisma: unknown) {
  const tracking = { emitirReasignacion: jest.fn() } as unknown as TrackingGateway;
  const uc = new AsignarViajeUseCase(prisma as PrismaService, tracking);
  return { uc, tracking };
}

/** SQL de todas las llamadas a $queryRaw (tagged template → array de trozos). */
function sqlEjecutado(queryRaw: jest.Mock): string[] {
  return queryRaw.mock.calls.map((c) => (c[0] as string[]).join('?'));
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

  it('intercambia solo la caja: audita la caja y no toca unidad/conductor', async () => {
    const { prisma, crearHistorial } = prismaMock({
      estado: EstadoViaje.EN_TRANSITO,
      folio: 6,
      unidadId: 'u1',
      cajaId: 'cajaVieja',
      conductorId: 'c1',
      unidad: { placas: 'TRACTOR-1' },
      caja: { placas: 'CAJA-A' },
      conductor: { nombre: 'Laura', apellidos: 'Méndez' },
    });
    prisma.caja.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'cajaNueva', activo: true, placas: 'CAJA-B' });
    const { uc, tracking } = crear(prisma);

    await uc.execute('v1', { cajaId: 'cajaNueva', motivo: 'ACCIDENTE' });

    const data = crearHistorial.mock.calls[0][0].data;
    expect(data).toMatchObject({
      cajaAnterior: 'CAJA-A',
      cajaNueva: 'CAJA-B',
      unidadAnterior: null, // la unidad no cambió
      conductorAnterior: null, // el conductor no cambió
    });
    const payload = (tracking.emitirReasignacion as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({ cajaCambio: true, unidadCambio: false, conductorCambio: false });
  });

  it('rechaza asignar un conductor ya ocupado en otro viaje (409)', async () => {
    const { prisma } = prismaMock({
      estado: EstadoViaje.ASIGNADO,
      folio: 6,
      conductorId: null,
      unidad: null,
      caja: null,
      conductor: null,
    });
    prisma.conductor.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'c2', activo: true, nombre: 'Pedro', apellidos: 'Ruiz' });
    // El conductor ya tiene un viaje abierto.
    prisma.viaje.findFirst = jest
      .fn()
      .mockResolvedValue({ folio: 9, estado: EstadoViaje.EN_TRANSITO });
    const { uc } = crear(prisma);

    await expect(
      uc.execute('v1', { conductorId: 'c2' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('carreras (TOCTOU)', () => {
    const viajeAbierto = {
      estado: EstadoViaje.ASIGNADO,
      folio: 6,
      unidadId: null,
      cajaId: null,
      conductorId: null,
      unidad: null,
      caja: null,
      conductor: null,
    };

    it('bloquea viaje, caja y conductor (en ese orden) antes de escribir', async () => {
      const { prisma, tx } = prismaMock(viajeAbierto);
      prisma.caja.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'cj1', activo: true, placas: 'CAJA-A' });
      prisma.conductor.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'c2', activo: true, nombre: 'Pedro', apellidos: 'Ruiz' });
      const { uc } = crear(prisma);

      await uc.execute('v1', { cajaId: 'cj1', conductorId: 'c2' });

      const sql = sqlEjecutado(tx.$queryRaw);
      expect(sql).toHaveLength(3);
      expect(sql[0]).toContain('"viajes"');
      expect(sql[1]).toContain('"cajas"');
      expect(sql[2]).toContain('"conductores"');
      expect(sql.every((s) => s.includes('FOR UPDATE'))).toBe(true);
    });

    it('409 si el conductor se ocupa entre el check temprano y la transacción', async () => {
      const { prisma, tx } = prismaMock(viajeAbierto);
      prisma.conductor.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'c2', activo: true, nombre: 'Pedro', apellidos: 'Ruiz' });
      // Libre en el check temprano, ocupado ya con el lock tomado.
      tx.viaje.findFirst = jest
        .fn()
        .mockResolvedValue({ folio: 9, estado: EstadoViaje.EN_TRANSITO });
      const { uc, tracking } = crear(prisma);

      await expect(
        uc.execute('v1', { conductorId: 'c2' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.viaje.update).not.toHaveBeenCalled();
      expect(tracking.emitirReasignacion).not.toHaveBeenCalled();
    });

    it('409 si el viaje se cancela entre el check temprano y la transacción', async () => {
      const { prisma, tx } = prismaMock(viajeAbierto, {}, {
        ...viajeAbierto,
        estado: EstadoViaje.CANCELADO,
      });
      prisma.conductor.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'c2', activo: true, nombre: 'Pedro', apellidos: 'Ruiz' });
      const { uc } = crear(prisma);

      await expect(
        uc.execute('v1', { conductorId: 'c2' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.viaje.update).not.toHaveBeenCalled();
    });

    it('audita contra la asignación leída dentro de la transacción, no la previa', async () => {
      // Otra reasignación entró en medio: el conductor previo real es c9, no c1.
      const { prisma, crearHistorial } = prismaMock(
        {
          ...viajeAbierto,
          conductorId: 'c1',
          conductor: { nombre: 'Laura', apellidos: 'Méndez' },
        },
        {},
        {
          ...viajeAbierto,
          conductorId: 'c9',
          conductor: { nombre: 'Ana', apellidos: 'Soto' },
        },
      );
      prisma.conductor.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'c2', activo: true, nombre: 'Pedro', apellidos: 'Ruiz' });
      const { uc } = crear(prisma);

      await uc.execute('v1', { conductorId: 'c2' });

      expect(crearHistorial.mock.calls[0][0].data).toMatchObject({
        conductorAnterior: 'Ana Soto',
        conductorNuevo: 'Pedro Ruiz',
      });
    });
  });
});
