import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatUseCase } from './chat.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { AuthPrincipal } from '../../presentation/http/auth/decorators/current-user.decorator';

/**
 * Construye un ChatUseCase con un PrismaService mock cuyo viaje.findUnique
 * devuelve `viaje` (o null). Storage y gateway son stubs: la autorización se
 * ejercita vía el método público `listar`, que delega en el privado
 * `autorizarObtenerConductor` antes de consultar mensajes.
 */
function crear(viaje: { conductorId: string | null } | null) {
  const prisma = {
    viaje: { findUnique: jest.fn().mockResolvedValue(viaje) },
    mensajeChat: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
  const storage = {} as unknown as StorageService;
  const tracking = {} as unknown as TrackingGateway;
  const uc = new ChatUseCase(prisma, storage, tracking);
  return { uc, prisma };
}

const conductor = (sub: string): AuthPrincipal => ({ sub, type: 'conductor' });
const admin = (sub: string): AuthPrincipal => ({
  sub,
  type: 'admin',
  rol: 'MONITORISTA',
});

describe('ChatUseCase autorización (scoping conductor↔viaje)', () => {
  it('el conductor accede al chat de SU viaje', async () => {
    const { uc } = crear({ conductorId: 'c1' });
    const res = await uc.listar('v1', conductor('c1'));
    expect(res.mensajes).toEqual([]);
    expect(res.hayMas).toBe(false);
  });

  it('rechaza al conductor que pide un viaje ajeno (403)', async () => {
    const { uc } = crear({ conductorId: 'c1' });
    await expect(uc.listar('v1', conductor('intruso'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza cuando el viaje no tiene conductor asignado y pide un conductor', async () => {
    const { uc } = crear({ conductorId: null });
    await expect(uc.listar('v1', conductor('c1'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lanza 404 si el viaje no existe', async () => {
    const { uc } = crear(null);
    await expect(uc.listar('v1', conductor('c1'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('el monitorista (admin) accede a cualquier viaje sin importar el conductor', async () => {
    const { uc } = crear({ conductorId: 'c1' });
    const res = await uc.listar('v1', admin('m1'));
    expect(res.mensajes).toEqual([]);
  });
});

describe('ChatUseCase palomitas (entregado/leído)', () => {
  function crearRico(
    viaje: { conductorId: string | null } | null,
    updateCount = 1,
  ) {
    const updateMany = jest.fn().mockResolvedValue({ count: updateCount });
    const prisma = {
      viaje: { findUnique: jest.fn().mockResolvedValue(viaje) },
      mensajeChat: { findMany: jest.fn().mockResolvedValue([]), updateMany },
    } as unknown as PrismaService;
    const storage = {} as unknown as StorageService;
    const tracking = {
      emitirChatEntregado: jest.fn(),
      emitirChatLeido: jest.fn(),
    } as unknown as TrackingGateway;
    const uc = new ChatUseCase(prisma, storage, tracking);
    return { uc, updateMany, tracking };
  }

  it('marcarRecibido emite chat:entregado cuando hay mensajes nuevos', async () => {
    const { uc, tracking } = crearRico({ conductorId: 'c1' });
    await uc.marcarRecibido('v1', conductor('c1'));
    expect(tracking.emitirChatEntregado).toHaveBeenCalledWith('v1', 'c1', {
      viajeId: 'v1',
      lector: 'CONDUCTOR',
    });
  });

  it('marcarRecibido NO emite si no había mensajes por marcar', async () => {
    const { uc, tracking } = crearRico({ conductorId: 'c1' }, 0);
    await uc.marcarRecibido('v1', conductor('c1'));
    expect(tracking.emitirChatEntregado).not.toHaveBeenCalled();
  });

  it('marcarLeido (monitorista) emite chat:leido con lector MONITORISTA', async () => {
    const { uc, tracking } = crearRico({ conductorId: 'c1' });
    await uc.marcarLeido('v1', admin('m1'));
    expect(tracking.emitirChatLeido).toHaveBeenCalledWith('v1', 'c1', {
      viajeId: 'v1',
      lector: 'MONITORISTA',
    });
  });

  it('aPayload deriva entregado/leído del lado destinatario (mensaje del conductor)', async () => {
    const fila = {
      id: 'm1',
      viajeId: 'v1',
      autorTipo: 'CONDUCTOR',
      autorNombre: 'Juan',
      usuarioId: null,
      conductorId: 'c1',
      texto: 'hola',
      archivoKey: null,
      archivoNombre: null,
      archivoTipo: null,
      archivoBytes: null,
      // El destinatario es el monitorista: recibió pero no leyó.
      recibidoMonitorista: true,
      recibidoConductor: false,
      leidoMonitorista: false,
      leidoConductor: false,
      createdAt: new Date('2026-06-29T00:00:00Z'),
    };
    const prisma = {
      viaje: { findUnique: jest.fn().mockResolvedValue({ conductorId: 'c1' }) },
      mensajeChat: { findMany: jest.fn().mockResolvedValue([fila]) },
    } as unknown as PrismaService;
    const uc = new ChatUseCase(
      prisma,
      {} as unknown as StorageService,
      {} as unknown as TrackingGateway,
    );

    const res = await uc.listar('v1', admin('m1'));
    expect(res.mensajes[0]).toMatchObject({ entregado: true, leido: false });
  });
});
