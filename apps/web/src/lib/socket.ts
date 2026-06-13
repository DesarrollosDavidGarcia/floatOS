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
