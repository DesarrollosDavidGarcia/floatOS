'use client';

import { useState, type ReactNode } from 'react';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { APIProvider } from '@vis.gl/react-google-maps';
import axios from 'axios';
import { AuthProvider } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { Toaster, toast } from '@/components/ui/sonner';
import { ConnectivityBanner } from '@/components/pwa/connectivity-banner';

/** Key de Google Maps para el navegador (Maps JS + Geocoding). Restringida por
 * referrer en producción. Si falta, los mapas no cargan pero la app funciona. */
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Feedback de error centralizado: un toast estándar ante cualquier
        // query fallida, en vez de repetir el manejo por página. Los 401 los
        // gestiona el interceptor de axios (refresh + redirect a /login), así
        // que se omiten para no spamear al usuario que ya será redirigido.
        queryCache: new QueryCache({
          onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              return;
            }
            toast.error(apiError(error));
          },
        }),
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            staleTime: 15_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <ConnectivityBanner />
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </APIProvider>
    </QueryClientProvider>
  );
}
