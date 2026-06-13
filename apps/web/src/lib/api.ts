import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Default relativo: en producción el panel y la API comparten origen (Nginx
// enruta /api), así una sola imagen sirve a cualquier cliente. En desarrollo se
// sobreescribe con la URL absoluta vía apps/web/.env.local.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

/**
 * La sesión del panel vive en cookies httpOnly (`flotaos_access`/`flotaos_refresh`)
 * emitidas por la API. `withCredentials` hace que el navegador las envíe en cada
 * petición; el JS nunca toca los tokens (mitiga XSS). El refresh también va por
 * cookie, así que no se adjunta ningún header Authorization desde el panel.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Refresh automático en 401 (una sola vez por petición). Deduplica refresh
// concurrentes compartiendo la misma promesa.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  try {
    // Sin body: el refresh token viaja en la cookie httpOnly.
    await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshing) refreshing = refreshSession();
      const ok = await refreshing;
      refreshing = null;
      if (ok) return api(original);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje de error legible de una respuesta de la API. */
export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as { message?: string | string[] })?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (msg) return msg;
    return error.message;
  }
  return 'Error inesperado';
}
