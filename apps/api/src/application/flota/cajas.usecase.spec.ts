import { ConflictException, NotFoundException } from '@nestjs/common';
import { CajasUseCase } from './cajas.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';

function crear(prisma: Record<string, unknown>) {
  return new CajasUseCase(prisma as unknown as PrismaService);
}

describe('CajasUseCase', () => {
  it('crear: rechaza placas duplicadas (409)', async () => {
    const uc = crear({
      caja: {
        findUnique: jest.fn().mockResolvedValue({ id: 'otra', placas: 'AB-123' }),
        create: jest.fn(),
      },
    });
    await expect(
      uc.crear({ placas: 'AB-123', tipo: 'SECA' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('crear: persiste cuando las placas son nuevas', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c1' });
    const uc = crear({
      caja: { findUnique: jest.fn().mockResolvedValue(null), create },
    });
    await uc.crear({ placas: 'AB-123', tipo: 'SECA', capacidadKg: 25000 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toMatchObject({ placas: 'AB-123', tipo: 'SECA' });
  });

  it('obtener: lanza 404 si no existe', async () => {
    const uc = crear({ caja: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(uc.obtener('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualizar: rechaza si las nuevas placas son de otra caja (409)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'c1' }) // obtener()
      .mockResolvedValueOnce({ id: 'otra', placas: 'AB-123' }); // chequeo de placas
    const uc = crear({ caja: { findUnique, update: jest.fn() } });
    await expect(
      uc.actualizar('c1', { placas: 'AB-123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('eliminar: bloquea si la caja tiene viajes asociados (409)', async () => {
    const uc = crear({
      caja: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }), delete: jest.fn() },
      viaje: { count: jest.fn().mockResolvedValue(2) },
    });
    await expect(uc.eliminar('c1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('eliminar: borra cuando no tiene viajes', async () => {
    const del = jest.fn().mockResolvedValue({});
    const uc = crear({
      caja: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }), delete: del },
      viaje: { count: jest.fn().mockResolvedValue(0) },
    });
    await uc.eliminar('c1');
    expect(del).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
