import { LimiteDiarioError, TomTomRouteProvider } from './tomtom.provider';

const A = { latitude: 19.0, longitude: -99.0 };
const B = { latitude: 19.5, longitude: -99.0 };
const C = { latitude: 19.5, longitude: -98.0 };

const OK_JSON = {
  routes: [
    {
      summary: { lengthInMeters: 211400, travelTimeInSeconds: 8280 },
      // Dos tramos que comparten el waypoint B (último de leg0 = primero de leg1).
      legs: [{ points: [A, B] }, { points: [B, C] }],
    },
  ],
};

const fetchOriginal = global.fetch;

function mockFetch(json: unknown, ok = true, status = 200) {
  const fn = jest
    .fn()
    .mockResolvedValue({ ok, status, json: async () => json } as Response);
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function nuevoProvider() {
  const prisma = { rutaCache: { count: jest.fn().mockResolvedValue(0) } };
  return new TomTomRouteProvider(prisma as any);
}

describe('TomTomRouteProvider', () => {
  const PUNTOS = [
    { lat: 19.0, lng: -99.0 },
    { lat: 19.5, lng: -98.0 },
  ];

  beforeEach(() => {
    process.env.TOMTOM_API_KEY = 'test-key';
    delete process.env.TOMTOM_MAX_DIARIO;
  });
  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
    delete process.env.TOMTOM_API_KEY;
  });

  it('parsea distancia, tiempo y geometría', async () => {
    mockFetch(OK_JSON);
    const r = await nuevoProvider().calcular(PUNTOS);
    expect(r.km).toBeCloseTo(211.4);
    expect(r.tiempoMin).toBeCloseTo(138); // 8280 / 60
    expect(r.metodo).toBe('RUTA');
  });

  it('sin departAt → URL con traffic=false', async () => {
    const f = mockFetch(OK_JSON);
    await nuevoProvider().calcular(PUNTOS);
    expect(f.mock.calls[0][0]).toContain('traffic=false');
  });

  it('con departAt → URL con traffic=true y departAt', async () => {
    const f = mockFetch(OK_JSON);
    const departAt = '2030-01-01T08:00:00.000Z';
    await nuevoProvider().calcular(PUNTOS, { departAt });
    const url = f.mock.calls[0][0] as string;
    expect(url).toContain('traffic=true');
    expect(url).toContain(`departAt=${encodeURIComponent(departAt)}`);
    expect(url).not.toContain('traffic=false');
  });

  it('dedup del waypoint compartido entre tramos (sin vértice doble)', async () => {
    mockFetch(OK_JSON);
    const r = await nuevoProvider().calcular(PUNTOS);
    // A, B, C — B aparece una sola vez (sin dedup serían 4 puntos).
    expect(r.geometria).toEqual([
      [19.0, -99.0],
      [19.5, -99.0],
      [19.5, -98.0],
    ]);
  });

  it('geometría con < 2 puntos → null', async () => {
    mockFetch({
      routes: [{ summary: { lengthInMeters: 1000 }, legs: [{ points: [A] }] }],
    });
    const r = await nuevoProvider().calcular(PUNTOS);
    expect(r.geometria).toBeNull();
  });

  it('res.ok=false → lanza con el status', async () => {
    mockFetch({}, false, 503);
    await expect(nuevoProvider().calcular(PUNTOS)).rejects.toThrow(/TomTom HTTP 503/);
  });

  it('respuesta sin ruta → lanza', async () => {
    mockFetch({ routes: [] });
    await expect(nuevoProvider().calcular(PUNTOS)).rejects.toThrow(/sin ruta/);
  });

  it('sin key → lanza', async () => {
    delete process.env.TOMTOM_API_KEY;
    await expect(nuevoProvider().calcular(PUNTOS)).rejects.toThrow(/TOMTOM_API_KEY/);
  });

  describe('tope diario', () => {
    beforeEach(() => {
      process.env.TOMTOM_MAX_DIARIO = '2';
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-08T10:00:00.000Z'));
    });
    afterEach(() => jest.useRealTimers());

    it('lanza LimiteDiarioError al superar el tope y resetea al cambiar de día', async () => {
      mockFetch(OK_JSON);
      const p = nuevoProvider();
      await p.calcular(PUNTOS); // 1
      await p.calcular(PUNTOS); // 2
      await expect(p.calcular(PUNTOS)).rejects.toBeInstanceOf(LimiteDiarioError); // 3 > tope

      jest.setSystemTime(new Date('2026-06-09T10:00:00.000Z'));
      await expect(p.calcular(PUNTOS)).resolves.toMatchObject({ metodo: 'RUTA' });
    });
  });
});
