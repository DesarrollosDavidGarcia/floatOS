import { io, type Socket } from 'socket.io-client';
import { tokenStore } from './token-store';

/**
 * URL base del servidor de WebSockets. El namespace '/tracking' se concatena
 * a esta URL. Coincide con el host de la API (sin el prefijo /api).
 */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Devuelve un socket conectado al namespace '/tracking', autenticado con el
 * access token guardado en localStorage. Reutiliza la misma instancia mientras
 * el socket siga vivo; si fue desconectado, crea uno nuevo con el token actual.
 *
 * El gateway de la API verifica `auth.token` en el handshake (ver
 * TrackingGateway.extraerToken) y desconecta si es inválido.
 */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  // Si existía un socket previo desconectado, lo limpiamos antes de recrear.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(`${WS_URL}/tracking`, {
    transports: ['websocket'],
    // Forma callback: cada (re)conexión toma el token fresco de localStorage.
    // Si se usara `auth: { token }` estático, tras expirar el access token la
    // reconexión reenviaría el token viejo y el gateway la rechazaría.
    auth: (cb) => cb({ token: tokenStore.getAccess() ?? '' }),
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
}
