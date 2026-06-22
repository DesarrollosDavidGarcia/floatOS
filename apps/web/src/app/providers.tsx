'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
import { ConnectivityBanner } from '@/components/pwa/connectivity-banner';

/** Key de Google Maps para el navegador (Maps JS + Geocoding). Restringida por
 * referrer en producción. Si falta, los mapas no cargan pero la app funciona. */
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
