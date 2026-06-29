import { ConflictException, NotFoundException } from '@nestjs/common';
import { GestionarPasajerosUseCase } from './gestionar-pasajeros.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/**
 * Mock de Prisma para el manifiesto: `viaje.findUnique` devuelve el viaje (o
 * null), `$transaction` ejecuta el callback con un tx stub, y findMany devuelve
 * la lista final.
 */
function crear(viaje: { tipoServicio: string } | null) {
  const tx = {
    pasajeroViaje: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const prisma = {
    viaje: { findUnique: jest.fn().mockResolvedValue(viaje) },
    escalaViaje: { count: jest.fn().mockResolvedValue(0) },
    pasajeroViaje: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;
  const uc = new GestionarPasajerosUseCase(prisma);
  return { uc, prisma, tx };
}

describe('GestionarPasajerosUseCase', () => {
  it('lanza 404 si el viaje no existe', async () => {
    const { uc } = crear(null);
    await expect(uc.execute('v1', [])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza (409) si el viaje no es de personal', async () => {
    const { uc } = crear({ tipoServicio: 'CARGA' });
    await expect(uc.execute('v1', [])).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('reemplaza el manifiesto (borra y recrea) en un viaje de personal', async () => {
    const { uc, tx } = crear({ tipoServicio: 'PERSONAL' });
    await uc.execute('v1', [{ nombre: '  Ana  ' }]);
    expect(tx.pasajeroViaje.deleteMany).toHaveBeenCalledWith({
      where: { viajeId: 'v1' },
    });
    expect(tx.pasajeroViaje.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ viajeId: 'v1', nombre: 'Ana', escalaId: null }),
      ],
    });
  });
});
