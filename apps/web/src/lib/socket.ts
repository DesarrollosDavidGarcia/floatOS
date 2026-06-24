import { io, type Socket } from 'socket.io-client';

/**
 * URL base del servidor de WebSockets. El namespace '/tracking' se concatena
 * a esta URL. Default vacío = mismo origen (en producción Nginx enruta
 * /socket.io al API), de modo que `io('/tracking')` usa el host actual y una
 * sola imagen sirve a cualquier cliente. En desarrollo se sobreescribe con la
 * URL absoluta vía apps/web/.env.local.
 */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? '';

let socket: Socket | null = null;

/**
 * Devuelve un socket conectado al namespace '/tracking'. La autenticación va por
 * la cookie httpOnly de acceso, que el navegador envía en el handshake gracias a
 * `withCredentials` (el gateway la lee en TrackingGateway.extraerToken). Reutiliza
 * la instancia mientras siga viva; si fue desconectada, crea una nueva.
 */
export function getSocket(): Socket {
  // Reutiliza la instancia si está conectada O en proceso de (re)conexión.
  // `socket.active` es true mientras el manager intenta conectar/reconectar
  // (estado 'connecting'); antes solo mirábamos `connected`, lo que destruía y
  // recreaba un socket que estaba a punto de conectar, perdiendo el handshake.
  if (socket && (socket.connected || socket.active)) return socket;

  // Si existía un socket previo realmente muerto (desconectado e inactivo), lo
  // limpiamos antes de recrear.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  // Una instancia nueva implica una sesión de salas nueva: el servidor no
  // conserva suscripciones de un socket anterior, así que reseteamos el conteo.
  salas.clear();

  socket = io(`${WS_URL}/tracking`, {
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
}

/** Cierra y descarta el socket actual (usar al desmontar la vista de tracking). */
export function closeSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  salas.clear();
}

/**
 * Conteo de suscriptores por `viajeId`. El socket es un singleton compartido por
 * varios consumidores (detalle de viaje, chat, notificaciones globales). Sin
 * refcount, el `desuscribir` de un consumidor sacaría al socket de la sala
 * `viaje:<id>` y cortaría a los demás. Emitimos `suscribir` solo en el primer
 * suscriptor y `desuscribir` solo cuando el último se va.
 */
const salas = new Map<string, number>();

/** Suscribe el socket a la sala del viaje (idempotente por consumidor). */
export function suscribirViaje(viajeId: string): void {
  const sock = getSocket();
  const n = salas.get(viajeId) ?? 0;
  salas.set(viajeId, n + 1);
  // Emite solo en el primer suscriptor; las reconexiones re-emiten por su cuenta
  // (los consumidores re-llaman a suscribirViaje en el evento 'connect').
  if (n === 0) sock.emit('suscribir', { viajeId });
}

/** Quita un suscriptor; emite `desuscribir` solo cuando llega a 0. */
export function desuscribirViaje(viajeId: string): void {
  const n = salas.get(viajeId) ?? 0;
  if (n <= 1) {
    salas.delete(viajeId);
    // Solo emite si el socket sigue vivo; si ya se cerró, no hay sala que dejar.
    if (socket) socket.emit('desuscribir', { viajeId });
  } else {
    salas.set(viajeId, n - 1);
  }
}
