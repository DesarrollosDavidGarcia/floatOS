import { ConceptosCostoUseCase } from './conceptos-costo.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BadRequestException } from '@nestjs/common';

function crear(filas: { id: string; concepto: string; costo: number; vidaUtilKm: number; notas?: string | null }[]) {
  const prisma = {
    unidad: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
    conceptoCostoUnidad: {
      findMany: jest.fn().mockResolvedValue(
        filas.map((f) => ({ ...f, unidadId: 'u1', notas: f.notas ?? null })),
      ),
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ id: 'c1' }),
      update: jest.fn(),
    },
  } as unknown as PrismaService;
  return new ConceptosCostoUseCase(prisma);
}

describe('conceptos de costo por km', () => {
  it('cada concepto aporta costo entre su vida útil', async () => {
    const uc = crear([
      { id: 'c1', concepto: 'Llantas', costo: 48000, vidaUtilKm: 60000 },
      { id: 'c2', concepto: 'Servicio mayor', costo: 9500, vidaUtilKm: 20000 },
    ]);
    const r = await uc.listar('u1');
    expect(r.conceptos[0].costoPorKm).toBe(0.8);
    expect(r.conceptos[1].costoPorKm).toBe(0.475);
    expect(r.totalPorKm).toBe(1.275);
  });

  it('redondea a 4 decimales, no a 2', async () => {
    // A $/km, dos decimales se comen diferencias que sí importan: 0.0833/km son
    // más de $40 en un viaje de 500 km.
    const uc = crear([{ id: 'c1', concepto: 'Frenos', costo: 5000, vidaUtilKm: 60000 }]);
    const r = await uc.listar('u1');
    expect(r.conceptos[0].costoPorKm).toBe(0.0833);
  });

  it('una unidad sin conceptos suma cero, no falla', async () => {
    const r = await crear([]).listar('u1');
    expect(r.conceptos).toEqual([]);
    expect(r.totalPorKm).toBe(0);
  });

  it('rechaza vida útil de 0 km al crear', async () => {
    await expect(
      crear([]).crear('u1', { concepto: 'X', costo: 100, vidaUtilKm: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza vida útil de 0 km al editar', async () => {
    await expect(
      crear([]).actualizar('c1', { vidaUtilKm: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
