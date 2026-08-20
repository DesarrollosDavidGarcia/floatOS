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
  const gateway = {
    emitirUbicacion: jest.fn(),
    emitirAlerta: jest.fn(),
  } as unknown as TrackingGateway;
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
    await expect(uc.execute('v1', 'intruso', punto)).rejects.toBeInstanceOf(NotFoundException);
    // Nunca debe insertar ubicaciones de un conductor no autorizado.
    expect(createManyAndReturn).not.toHaveBeenCalled();
  });

  it('rechaza si el viaje no existe (404)', async () => {
    const { uc, createManyAndReturn } = crear(null);
    await expect(uc.execute('v1', 'c1', punto)).rejects.toBeInstanceOf(NotFoundException);
    expect(createManyAndReturn).not.toHaveBeenCalled();
  });

  it('rechaza si el viaje no tiene conductor asignado', async () => {
    const { uc } = crear({
      id: 'v1',
      conductorId: null,
      estado: EstadoViaje.EN_TRANSITO,
    });
    await expect(uc.execute('v1', 'c1', punto)).rejects.toBeInstanceOf(NotFoundException);
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

/**
 * Construye el caso de uso con los counts del cortocircuito de geocerca
 * controlados uno por uno, para poder afirmar QUÉ mitad de la geocerca corre.
 * `escalaViaje.count` se resuelve según el where: el de llegadas pendientes
 * (`llegadaNotificadaEn: null`) y el de estancias abiertas comparten modelo.
 */
function crearConGeocerca(opciones: {
  llegadasPendientes: number;
  contactosPendientes: number;
  salidasPendientes: number;
  filasSalida?: { id: string; salidaEn: Date | null }[];
}) {
  const registro = {
    id: 'u1',
    viajeId: 'v1',
    lat: 19.4,
    lng: -99.1,
    velocidad: null,
    rumbo: null,
    precision: null,
    capturadoEn: new Date('2026-08-20T10:00:00Z'),
    createdAt: new Date(),
  };
  const queryRaw = jest.fn().mockResolvedValue(opciones.filasSalida ?? []);
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    viaje: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'v1',
        conductorId: 'c1',
        estado: EstadoViaje.EN_TRANSITO,
        folio: 7,
      }),
    },
    ubicacionConductor: {
      createManyAndReturn: jest.fn().mockResolvedValue([registro]),
    },
    escalaViaje: {
      count: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(
            where.salidaRegistradaEn === null
              ? opciones.salidasPendientes
              : opciones.llegadasPendientes,
          ),
        ),
      updateMany,
      aggregate: jest.fn().mockResolvedValue({ _max: { orden: 0 } }),
    },
    contactoEscala: {
      count: jest.fn().mockResolvedValue(opciones.contactosPendientes),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
    $queryRaw: queryRaw,
  } as unknown as PrismaService;
  const gateway = {
    emitirUbicacion: jest.fn(),
    emitirAlerta: jest.fn(),
  } as unknown as TrackingGateway;
  const email = { enviar: jest.fn() } as unknown as EmailService;
  const uc = new RegistrarUbicacionUseCase(prisma, gateway, email);
  return { uc, queryRaw, updateMany };
}

describe('RegistrarUbicacionUseCase salida de escala (cierre de estancia)', () => {
  it('no toca PostGIS si no hay llegadas, contactos ni estancias pendientes', async () => {
    const { uc, queryRaw, updateMany } = crearConGeocerca({
      llegadasPendientes: 0,
      contactosPendientes: 0,
      salidasPendientes: 0,
    });
    await uc.execute('v1', 'c1', punto);
    // El cortocircuito es lo que evita pagar el ST_DWithin en cada ping tardío.
    expect(queryRaw).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('sella la salida con el instante que devuelve la consulta, no con now()', async () => {
    const salidaEn = new Date('2026-08-20T09:30:00Z');
    const { uc, queryRaw, updateMany } = crearConGeocerca({
      llegadasPendientes: 0,
      contactosPendientes: 0,
      salidasPendientes: 1,
      filasSalida: [{ id: 'e1', salidaEn }],
    });
    await uc.execute('v1', 'c1', punto);
    // Solo corre la mitad de salidas: no hay llegadas ni contactos pendientes.
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      // El filtro por null es lo que hace idempotente el sellado entre lotes
      // concurrentes del mismo viaje.
      where: { id: 'e1', salidaRegistradaEn: null },
      data: { salidaRegistradaEn: salidaEn },
    });
  });

  it('no sella nada si el conductor sigue dentro del radio', async () => {
    const { uc, queryRaw, updateMany } = crearConGeocerca({
      llegadasPendientes: 0,
      contactosPendientes: 0,
      salidasPendientes: 1,
      filasSalida: [],
    });
    await uc.execute('v1', 'c1', punto);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('no evalúa salidas en un viaje ya cerrado (GPS residual)', async () => {
    const { uc, queryRaw } = crearConGeocerca({
      llegadasPendientes: 1,
      contactosPendientes: 1,
      salidasPendientes: 1,
    });
    // ENTREGADO está en ESTADOS_SIN_GEOCERCA: ni llegadas ni salidas.
    (
      uc as unknown as {
        prisma: { viaje: { findUnique: jest.Mock } };
      }
    ).prisma.viaje.findUnique.mockResolvedValue({
      id: 'v1',
      conductorId: 'c1',
      estado: EstadoViaje.ENTREGADO,
    });
    await uc.execute('v1', 'c1', punto);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe('RegistrarUbicacionUseCase llegada de escala (apertura de estancia)', () => {
  it('sella la llegada real con la hora del ping y el aviso con now()', async () => {
    const primeraDentroEn = new Date('2026-08-20T08:00:00Z');
    const { uc, updateMany } = crearConGeocerca({
      llegadasPendientes: 1,
      contactosPendientes: 0,
      salidasPendientes: 0,
      // Con salidas en 0 solo corre la consulta de llegadas, así que el mock de
      // $queryRaw devuelve escalas cercanas sin ambigüedad.
      filasSalida: [
        {
          id: 'e1',
          orden: 0,
          accion: 'ENTREGAR',
          direccion: 'Bodega 1',
          llegadaNotificadaEn: null,
          primeraDentroEn,
        } as never,
      ],
    });
    await uc.execute('v1', 'c1', punto);

    expect(updateMany).toHaveBeenCalledTimes(1);
    const { where, data } = updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: 'e1', llegadaNotificadaEn: null });
    // El hecho se fecha con el GPS; el aviso, con el reloj del servidor. Que sean
    // el mismo campo es lo que hacía negativa la demora en lotes offline.
    expect(data.llegadaEn).toEqual(primeraDentroEn);
    expect(data.llegadaNotificadaEn).not.toEqual(primeraDentroEn);
  });
});
