import { RouteService } from './route.service';
import { claveRuta, type PuntoRuta, type RutaCalculada } from './route-provider';
import { LimiteDiarioError } from './tomtom.provider';

const CDMX: PuntoRuta = { lat: 19.4326, lng: -99.1332 };
const QRO: PuntoRuta = { lat: 20.5888, lng: -100.3899 };

describe('claveRuta', () => {
  it('es determinista para los mismos puntos y perfil', () => {
    expect(claveRuta([CDMX, QRO], 'TOMTOM')).toBe(
      claveRuta([CDMX, QRO], 'TOMTOM'),
    );
  });

  it('redondea a ~11 m: un pin movido unos metros pega en la misma clave', () => {
    const movido: PuntoRuta = { lat: CDMX.lat + 0.00001, lng: CDMX.lng - 0.00002 };
    expect(claveRuta([movido, QRO], 'TOMTOM')).toBe(
      claveRuta([CDMX, QRO], 'TOMTOM'),
    );
  });

  it('distingue el orden de las escalas', () => {
    expect(claveRuta([CDMX, QRO], 'TOMTOM')).not.toBe(
      claveRuta([QRO, CDMX], 'TOMTOM'),
    );
  });
});

describe('RouteService', () => {
  const geo: RutaCalculada = {
    km: 200,
    tiempoMin: null,
    metodo: 'GEODESICA',
    geometria: null,
    advertencias: [],
  };
  const ruta: RutaCalculada = {
    km: 211.4,
    tiempoMin: 138,
    metodo: 'RUTA',
    geometria: [
      [19.4326, -99.1332],
      [20.5888, -100.3899],
    ],
    advertencias: [],
  };

  const geodesica = { calcular: jest.fn().mockResolvedValue(geo) };

  function make(opts: {
    disponible: boolean;
    cacheHit?: {
      distanciaKm: number;
      tiempoMin: number | null;
      geometria?: number[][] | null;
    };
    tomtom?: () => Promise<RutaCalculada>;
  }) {
    geodesica.calcular.mockClear();
    const tomtom = {
      disponible: () => opts.disponible,
      calcular: jest.fn(opts.tomtom ?? (() => Promise.resolve(ruta))),
    };
    const prisma = {
      rutaCache: {
        findUnique: jest.fn().mockResolvedValue(opts.cacheHit ?? null),
        create: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const svc = new RouteService(prisma as any, tomtom as any, geodesica as any);
    return { svc, tomtom, prisma };
  }

  it('sin key: usa geodésica y no toca TomTom', async () => {
    const { svc, tomtom } = make({ disponible: false });
    const r = await svc.calcular([CDMX, QRO]);
    expect(r.metodo).toBe('GEODESICA');
    expect(tomtom.calcular).not.toHaveBeenCalled();
  });

  it('preferGeodesica: con key, fuerza geodésica sin tocar caché ni TomTom', async () => {
    const { svc, tomtom, prisma } = make({ disponible: true });
    const r = await svc.calcular([CDMX, QRO], { preferGeodesica: true });
    expect(r.metodo).toBe('GEODESICA');
    expect(tomtom.calcular).not.toHaveBeenCalled();
    expect(prisma.rutaCache.findUnique).not.toHaveBeenCalled();
  });

  it('cache hit: devuelve RUTA con geometría sin llamar a TomTom', async () => {
    const geometria = [
      [19.4326, -99.1332],
      [20.5888, -100.3899],
    ];
    const { svc, tomtom } = make({
      disponible: true,
      cacheHit: { distanciaKm: 211.4, tiempoMin: 138, geometria },
    });
    const r = await svc.calcular([CDMX, QRO]);
    expect(r).toMatchObject({ km: 211.4, tiempoMin: 138, metodo: 'RUTA', geometria });
    expect(tomtom.calcular).not.toHaveBeenCalled();
  });

  it('cache hit con geometría corrupta: la descarta (null)', async () => {
    const { svc } = make({
      disponible: true,
      cacheHit: { distanciaKm: 211.4, tiempoMin: 138, geometria: [[1] as any] },
    });
    const r = await svc.calcular([CDMX, QRO]);
    expect(r.geometria).toBeNull();
  });

  it('cache miss: llama a TomTom y persiste el resultado', async () => {
    const { svc, tomtom, prisma } = make({ disponible: true });
    const r = await svc.calcular([CDMX, QRO]);
    expect(r.metodo).toBe('RUTA');
    expect(tomtom.calcular).toHaveBeenCalledTimes(1);
    expect(prisma.rutaCache.create).toHaveBeenCalledTimes(1);
  });

  it('reenvía departAt válido (futuro) al proveedor TomTom', async () => {
    const { svc, tomtom } = make({ disponible: true });
    const departAt = '2030-01-01T08:00:00.000Z';
    await svc.calcular([CDMX, QRO], { departAt });
    expect(tomtom.calcular).toHaveBeenCalledWith([CDMX, QRO], { departAt });
  });

  it('ignora departAt pasado: flujo libre (departAt=null)', async () => {
    const { svc, tomtom } = make({ disponible: true });
    await svc.calcular([CDMX, QRO], { departAt: '2000-01-01T00:00:00.000Z' });
    expect(tomtom.calcular).toHaveBeenCalledWith([CDMX, QRO], { departAt: null });
  });

  it('falla TomTom: degrada a geodésica con advertencia', async () => {
    const { svc } = make({
      disponible: true,
      tomtom: () => Promise.reject(new Error('TomTom HTTP 500')),
    });
    const r = await svc.calcular([CDMX, QRO]);
    expect(r.metodo).toBe('GEODESICA');
    expect(r.advertencias.join(' ')).toMatch(/línea recta/);
  });

  it('tope diario (LimiteDiarioError): degrada con mensaje específico', async () => {
    const { svc } = make({
      disponible: true,
      tomtom: () => Promise.reject(new LimiteDiarioError()),
    });
    const r = await svc.calcular([CDMX, QRO]);
    expect(r.metodo).toBe('GEODESICA');
    expect(r.advertencias.join(' ')).toMatch(/tope diario/);
  });

  it('menos de 2 puntos: 0 km sin tocar proveedores', async () => {
    const { svc, tomtom } = make({ disponible: true });
    const r = await svc.calcular([CDMX]);
    expect(r).toMatchObject({ km: 0, metodo: 'GEODESICA' });
    expect(tomtom.calcular).not.toHaveBeenCalled();
  });
});
