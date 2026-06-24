import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests del ciclo de vida del socket singleton de `@/lib/socket`.
 *
 * Se mockea `socket.io-client`: `io()` devuelve un socket falso controlable
 * (flags `connected`/`active` mutables + espías de `emit`/`disconnect`/etc.).
 * El módulo guarda el socket en estado de módulo, así que cada test resetea los
 * módulos y re-importa para empezar con `socket = null`.
 */

/** Crea un socket falso con la superficie usada por el módulo real. */
function crearSocketFalso() {
  return {
    connected: false,
    active: false,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
  };
}

// Cola de sockets que `io()` irá devolviendo, en orden, en cada llamada.
let cola: ReturnType<typeof crearSocketFalso>[] = [];
const io = vi.fn((..._args: unknown[]) => {
  const next = cola.shift();
  if (!next) throw new Error('io() llamado sin socket falso encolado');
  return next;
});

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => io(...args),
}));

/** Resetea módulos + cola y re-importa el módulo bajo prueba (socket = null). */
async function cargarModulo() {
  vi.resetModules();
  return import('@/lib/socket');
}

beforeEach(() => {
  io.mockClear();
  cola = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getSocket', () => {
  it('crea una nueva instancia cuando no hay socket', async () => {
    const s = crearSocketFalso();
    cola = [s];
    const { getSocket } = await cargarModulo();

    const result = getSocket();

    expect(io).toHaveBeenCalledTimes(1);
    expect(result).toBe(s);
  });

  it('pasa el namespace /tracking y opciones esperadas a io()', async () => {
    cola = [crearSocketFalso()];
    const { getSocket } = await cargarModulo();

    getSocket();

    expect(io).toHaveBeenCalledWith(
      '/tracking',
      expect.objectContaining({
        transports: ['websocket'],
        withCredentials: true,
        autoConnect: true,
      }),
    );
  });

  it('reutiliza la instancia cuando está connected', async () => {
    const s = crearSocketFalso();
    s.connected = true;
    cola = [s];
    const { getSocket } = await cargarModulo();

    const a = getSocket();
    const b = getSocket();

    expect(a).toBe(b);
    expect(io).toHaveBeenCalledTimes(1); // no recrea
  });

  it('reutiliza la instancia cuando está active (reconectando) aunque no esté connected', async () => {
    const s = crearSocketFalso();
    s.connected = false;
    s.active = true;
    cola = [s];
    const { getSocket } = await cargarModulo();

    const a = getSocket();
    const b = getSocket();

    expect(a).toBe(b);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('descarta el socket muerto (no connected ni active) y crea uno nuevo', async () => {
    const muerto = crearSocketFalso(); // connected=false, active=false
    const nuevo = crearSocketFalso();
    cola = [muerto, nuevo];
    const { getSocket } = await cargarModulo();

    const a = getSocket();
    const b = getSocket();

    expect(a).toBe(muerto);
    expect(b).toBe(nuevo);
    expect(io).toHaveBeenCalledTimes(2);
    // Limpió el muerto antes de recrear.
    expect(muerto.removeAllListeners).toHaveBeenCalled();
    expect(muerto.disconnect).toHaveBeenCalled();
  });
});

describe('closeSocket', () => {
  it('limpia y descarta el socket activo', async () => {
    const s = crearSocketFalso();
    s.connected = true;
    cola = [s];
    const { getSocket, closeSocket } = await cargarModulo();

    getSocket();
    closeSocket();

    expect(s.removeAllListeners).toHaveBeenCalled();
    expect(s.disconnect).toHaveBeenCalled();
  });

  it('tras cerrar, getSocket crea una instancia nueva', async () => {
    const s1 = crearSocketFalso();
    s1.connected = true;
    const s2 = crearSocketFalso();
    cola = [s1, s2];
    const { getSocket, closeSocket } = await cargarModulo();

    getSocket();
    closeSocket();
    const result = getSocket();

    expect(result).toBe(s2);
    expect(io).toHaveBeenCalledTimes(2);
  });

  it('es seguro llamarlo sin socket previo (no lanza)', async () => {
    const { closeSocket } = await cargarModulo();
    expect(() => closeSocket()).not.toThrow();
  });
});

describe('suscribirViaje / desuscribirViaje (refcount)', () => {
  it('emite "suscribir" solo en el primer suscriptor', async () => {
    const s = crearSocketFalso();
    s.connected = true;
    cola = [s];
    const { suscribirViaje } = await cargarModulo();

    suscribirViaje('v1');
    suscribirViaje('v1');
    suscribirViaje('v1');

    const subs = s.emit.mock.calls.filter((c: unknown[]) => c[0] === 'suscribir');
    expect(subs).toHaveLength(1);
    expect(subs[0][1]).toEqual({ viajeId: 'v1' });
  });

  it('emite "desuscribir" solo cuando el refcount llega a 0', async () => {
    const s = crearSocketFalso();
    s.connected = true;
    cola = [s];
    const { suscribirViaje, desuscribirViaje } = await cargarModulo();

    suscribirViaje('v1'); // count 1
    suscribirViaje('v1'); // count 2

    desuscribirViaje('v1'); // count 1 -> sin emit
    let desubs = s.emit.mock.calls.filter((c: unknown[]) => c[0] === 'desuscribir');
    expect(desubs).toHaveLength(0);

    desuscribirViaje('v1'); // count 0 -> emit
    desubs = s.emit.mock.calls.filter((c: unknown[]) => c[0] === 'desuscribir');
    expect(desubs).toHaveLength(1);
    expect(desubs[0][1]).toEqual({ viajeId: 'v1' });
  });

  it('lleva refcount independiente por viajeId', async () => {
    const s = crearSocketFalso();
    s.connected = true;
    cola = [s];
    const { suscribirViaje } = await cargarModulo();

    suscribirViaje('v1');
    suscribirViaje('v2');

    const subs = s.emit.mock.calls.filter((c: unknown[]) => c[0] === 'suscribir');
    expect(subs).toHaveLength(2);
    expect(subs.map((c: unknown[]) => c[1])).toEqual([{ viajeId: 'v1' }, { viajeId: 'v2' }]);
  });

  it('desuscribir de un viaje no suscrito (count 0) no falla y emite una vez', async () => {
    const s = crearSocketFalso();
    s.connected = true;
    cola = [s];
    const { suscribirViaje, desuscribirViaje } = await cargarModulo();
    // Creamos el socket primero (desuscribirViaje no lo crea); 'suscribir' no
    // cuenta para el filtro de 'desuscribir' de abajo.
    suscribirViaje('otro');

    // n = 0 para 'fantasma', rama n <= 1: borra (no-op) y como el socket existe,
    // emite un 'desuscribir' inocuo sin fallar.
    expect(() => desuscribirViaje('fantasma')).not.toThrow();
    const desubs = s.emit.mock.calls.filter((c: unknown[]) => c[0] === 'desuscribir');
    expect(desubs).toHaveLength(1);
  });

  it('resetea el conteo de salas al recrear el socket', async () => {
    const muerto = crearSocketFalso(); // se considerará muerto en la 2ª llamada
    const nuevo = crearSocketFalso();
    nuevo.connected = true;
    cola = [muerto, nuevo];
    const { suscribirViaje } = await cargarModulo();

    // 1ª suscripción crea `muerto` (connected=false, active=false) y emite.
    suscribirViaje('v1');
    expect(muerto.emit.mock.calls.filter((c: unknown[]) => c[0] === 'suscribir')).toHaveLength(1);

    // 2ª suscripción: muerto está muerto -> getSocket lo descarta, crea `nuevo`
    // y salas.clear() resetea el conteo, así que vuelve a emitir "suscribir".
    suscribirViaje('v1');
    expect(nuevo.emit.mock.calls.filter((c: unknown[]) => c[0] === 'suscribir')).toHaveLength(1);
  });
});
