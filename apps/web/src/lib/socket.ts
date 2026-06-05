import { io, type Socket } from 'socket.io-client';

/**
 * URL base del servidor de WebSockets. El namespace '/tracking' se concatena
 * a esta URL. Coincide con el host de la API (sin el prefijo /api).
 */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Devuelve un socket conectado al namespace '/tracking'. La autenticación va por
 * la cookie httpOnly de acceso, que el navegador envía en el handshake gracias a
 * `withCredentials` (el gateway la lee en TrackingGateway.extraerToken). Reutiliza
 * la instancia mientras siga viva; si fue desconectada, crea una nueva.
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
}
