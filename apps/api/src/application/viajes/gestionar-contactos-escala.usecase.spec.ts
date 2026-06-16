import { ConflictException, NotFoundException } from '@nestjs/common';
import { GestionarContactosEscalaUseCase } from './gestionar-contactos-escala.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Crea el use case con un PrismaService parcial mockeado. */
function crear(prisma: Partial<Record<string, unknown>>) {
  return new GestionarContactosEscalaUseCase(prisma as unknown as PrismaService);
}

describe('GestionarContactosEscalaUseCase', () => {
  it('lanza NotFound si la escala no pertenece al viaje', async () => {
    const prisma = {
      escalaViaje: { findFirst: jest.fn().mockResolvedValue(null) },
      cotizacion: { count: jest.fn() },
    };
    const uc = crear(prisma);

    await expect(uc.execute('v1', 'e1', [])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // No debe siquiera consultar la cotización si la escala no existe.
    expect(prisma.cotizacion.count).not.toHaveBeenCalled();
  });

  it('lanza Conflict (409) si el viaje no tiene cotización aceptada', async () => {
    const prisma = {
      escalaViaje: { findFirst: jest.fn().mockResolvedValue({ id: 'e1' }) },
      cotizacion: { count: jest.fn().mockResolvedValue(0) },
    };
    const uc = crear(prisma);

    await expect(
      uc.execute('v1', 'e1', [{ nombre: 'Ana' }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reemplaza los contactos cuando hay cotización aceptada', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const tx = { contactoEscala: { deleteMany, createMany } };
    const prisma = {
      escalaViaje: { findFirst: jest.fn().mockResolvedValue({ id: 'e1' }) },
      cotizacion: { count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      contactoEscala: {
        findMany: jest.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
      },
    };
    const uc = crear(prisma);

    const res = await uc.execute('v1', 'e1', [
      { nombre: 'Ana', email: 'ana@x.com' },
      { nombre: 'Juan', telefono: '55' },
    ]);

    expect(deleteMany).toHaveBeenCalledWith({ where: { escalaId: 'e1' } });
    const data = createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ escalaId: 'e1', nombre: 'Ana', email: 'ana@x.com' });
    // Sin email → se normaliza a null (no se intenta avisar).
    expect(data[1].email).toBeNull();
    expect(res).toHaveLength(2);
  });

  it('borra y no recrea cuando la lista llega vacía', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const createMany = jest.fn();
    const tx = { contactoEscala: { deleteMany, createMany } };
    const prisma = {
      escalaViaje: { findFirst: jest.fn().mockResolvedValue({ id: 'e1' }) },
      cotizacion: { count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      contactoEscala: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const uc = crear(prisma);

    await uc.execute('v1', 'e1', []);

    expect(deleteMany).toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});
