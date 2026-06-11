'use client';

import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';

const HEALTH_URL = `${API_URL}/health`;
const PING_TIMEOUT_MS = 5000;
const PING_INTERVAL_OK_MS = 30_000;
// Mientras el servidor parece caído, sondeamos más seguido para recuperarnos
// (y para no dejar el banner ámbar 30 s tras un fallo transitorio).
const PING_INTERVAL_ERROR_MS = 5_000;

/**
 * Comprueba periódicamente si el servidor del API responde (GET /health).
 * Detecta caídas del backend aunque el navegador siga teniendo red.
 *
 * @param enabled normalmente el estado `online` del navegador: no tiene sentido
 *   hacer ping si ya sabemos que no hay conexión de red.
 */
export function useApiReachable(enabled: boolean) {
  const query = useQuery({
    queryKey: ['__api_health__'],
    queryFn: async ({ signal }) => {
      // Abortamos por timeout o si React Query cancela la consulta.
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

      try {
        const res = await fetch(HEALTH_URL, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        // Cualquier respuesta HTTP = el servidor está vivo y accesible.
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
      }
    },
    enabled,
    // Un fallo aislado reintenta una vez antes de declarar el servidor caído,
    // evitando falsas alarmas por un blip de red.
    retry: 1,
    retryDelay: 2000,
    refetchInterval: (query) =>
      query.state.status === 'error'
        ? PING_INTERVAL_ERROR_MS
        : PING_INTERVAL_OK_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
  });

  // Optimista: solo lo marcamos como inalcanzable ante un error confirmado.
  return { reachable: !query.isError };
}
