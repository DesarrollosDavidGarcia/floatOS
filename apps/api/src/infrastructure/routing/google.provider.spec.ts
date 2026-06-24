import { LimiteDiarioError } from './route-provider';
import { GoogleRouteProvider } from './google.provider';

// Polilínea de ejemplo oficial de Google (3 puntos) — reutilizada como geometría.
const ENC = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const OK_JSON = {
  routes: [
    {
      distanceMeters: 211400,
      duration: '8280s',
      polyline: { encodedPolyline: ENC },
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
  return new GoogleRouteProvider(prisma as any);
}

describe('GoogleRouteProvider', () => {
  const PUNTOS = [
    { lat: 19.0, lng: -99.0 },
    { lat: 19.5, lng: -98.0 },
  ];

  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = 'test-key';
    delete process.env.GOOGLE_MAPS_MAX_DIARIO;
  });
  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
  });

  it('parsea distancia, tiempo y geometría', async () => {
    mockFetch(OK_JSON);
    const r = await nuevoProvider().calcular(PUNTOS);
    expect(r.km).toBeCloseTo(211.4);
    expect(r.tiempoMin).toBeCloseTo(138); // 8280s / 60
    expect(r.metodo).toBe('RUTA');
    expect(r.geometria).not.toBeNull();
    expect(r.geometria!.length).toBeGreaterThanOrEqual(2);
  });

  it('manda la key en el header X-Goog-Api-Key, no en la URL', async () => {
    const f = mockFetch(OK_JSON);
    await nuevoProvider().calcular(PUNTOS);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('test-key');
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe('test-key');
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).toContain(
      'routes.polyline.encodedPolyline',
    );
  });

  it('sin departAt → TRAFFIC_UNAWARE y sin departureTime', async () => {
    const f = mockFetch(OK_JSON);
    await nuevoProvider().calcular(PUNTOS);
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.travelMode).toBe('DRIVE');
    expect(body.routingPreference).toBe('TRAFFIC_UNAWARE');
    expect(body.departureTime).toBeUndefined();
  });

  it('con departAt → TRAFFIC_AWARE y departureTime', async () => {
    const f = mockFetch(OK_JSON);
    const departAt = '2030-01-01T08:00:00.000Z';
    await nuevoProvider().calcular(PUNTOS, { departAt });
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.routingPreference).toBe('TRAFFIC_AWARE');
    expect(body.departureTime).toBe(departAt);
  });

  it('escalas intermedias → van en intermediates', async () => {
    const f = mockFetch(OK_JSON);
    const conEscala = [
      { lat: 19.0, lng: -99.0 },
      { lat: 19.25, lng: -98.5 },
      { lat: 19.5, lng: -98.0 },
    ];
    await nuevoProvider().calcular(conEscala);
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.intermediates).toHaveLength(1);
    expect(body.intermediates[0].location.latLng).toEqual({
      latitude: 19.25,
      longitude: -98.5,
    });
  });

  it('sin polilínea → geometría null pero km/tiempo válidos', async () => {
    mockFetch({ routes: [{ distanceMeters: 1000, duration: '60s' }] });
    const r = await nuevoProvider().calcular(PUNTOS);
    expect(r.geometria).toBeNull();
    expect(r.km).toBeCloseTo(1);
  });

  it('res.ok=false → lanza con el status', async () => {
    mockFetch({}, false, 503);
    await expect(nuevoProvider().calcular(PUNTOS)).rejects.toThrow(/Google HTTP 503/);
  });

  it('respuesta sin ruta → lanza', async () => {
    mockFetch({ routes: [] });
    await expect(nuevoProvider().calcular(PUNTOS)).rejects.toThrow(/sin ruta/);
  });

  it('sin key → lanza', async () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    await expect(nuevoProvider().calcular(PUNTOS)).rejects.toThrow(
      /GOOGLE_MAPS_SERVER_KEY/,
    );
  });

  describe('tope diario', () => {
    beforeEach(() => {
      process.env.GOOGLE_MAPS_MAX_DIARIO = '2';
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
