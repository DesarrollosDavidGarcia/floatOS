import { NotFoundException } from '@nestjs/common';
import { EstadoViaje } from '@prisma/client';
import { RegistrarUbicacionUseCase } from './registrar-ubicacion.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { EmailService } from '../../infrastructure/email/email.service';
import { PuntoUbicacion } from './tracking.types';

/**
 * Construye el caso de uso con un PrismaService mock cuyo viaje.findUnique
 * devuelve `viaje`. El resto de dependencias son stubs; el foco es la
 * autorización por conductorId que ocurre ANTES de cualquier inserción.
 */
function crear(viaje: { id: string; conductorId: string | null; estado: EstadoViaje } | null) {
  const createManyAndReturn = jest.fn().mockResolvedValue([]);
  const prisma = {
    viaje: { findUnique: jest.fn().mockResolvedValue(viaje) },
    ubicacionConductor: { createManyAndReturn },
    escalaViaje: { count: jest.fn().mockResolvedValue(0) },
    contactoEscala: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  const gateway = { emitirUbicacion: jest.fn(), emitirAlerta: jest.fn() } as unknown as TrackingGateway;
  const email = { enviar: jest.fn() } as unknown as EmailService;
  const uc = new RegistrarUbicacionUseCase(prisma, gateway, email);
  return { uc, createManyAndReturn };
}

const punto: PuntoUbicacion = {
  lat: 19.4,
  lng: -99.1,
  capturadoEn: new Date().toISOString(),
};

describe('RegistrarUbicacionUseCase autorización (scoping conductor↔viaje)', () => {
  it('rechaza si el conductorId del token no coincide con el del viaje (404)', async () => {
    const { uc, createManyAndReturn } = crear({
      id: 'v1',
      conductorId: 'c1',
      estado: EstadoViaje.EN_TRANSITO,
    });
    await expect(
      uc.execute('v1', 'intruso', punto),
    ).rejects.toBeInstanceOf(NotFoundException);
    // Nunca debe insertar ubicaciones de un conductor no autorizado.
    expect(createManyAndReturn).not.toHaveBeenCalled();
  });

  it('rechaza si el viaje no existe (404)', async () => {
    const { uc, createManyAndReturn } = crear(null);
    await expect(uc.execute('v1', 'c1', punto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(createManyAndReturn).not.toHaveBeenCalled();
  });

  it('rechaza si el viaje no tiene conductor asignado', async () => {
    const { uc } = crear({
      id: 'v1',
      conductorId: null,
      estado: EstadoViaje.EN_TRANSITO,
    });
    await expect(uc.execute('v1', 'c1', punto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('permite registrar cuando el conductorId coincide', async () => {
    const registro = {
      id: 'u1',
      viajeId: 'v1',
      lat: punto.lat,
      lng: punto.lng,
      velocidad: null,
      rumbo: null,
      precision: null,
      capturadoEn: new Date(punto.capturadoEn),
      createdAt: new Date(),
    };
    const { uc, createManyAndReturn } = crear({
      id: 'v1',
      conductorId: 'c1',
      estado: EstadoViaje.EN_TRANSITO,
    });
    createManyAndReturn.mockResolvedValue([registro]);
    const res = await uc.execute('v1', 'c1', punto);
    expect(res.id).toBe('u1');
    expect(createManyAndReturn).toHaveBeenCalledTimes(1);
  });
});
