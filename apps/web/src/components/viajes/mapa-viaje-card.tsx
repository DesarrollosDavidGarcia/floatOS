'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { ESTADOS_ACTIVOS } from '@/lib/estado-viaje';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useViajeEnVivo } from './use-viaje-en-vivo';
import type { Viaje } from './types';
import type { PosicionViaje } from '@/components/tracking/tipos';

// Mapa con Leaflet: usa `window`, se carga solo en cliente.
const MapaItinerario = dynamic(() => import('./mapa-itinerario'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Cargando mapa…
    </div>
  ),
});

/**
 * Tarjeta "Mapa del itinerario" del detalle de viaje, con la posición del
 * conductor en tiempo real. Vive como componente propio para que los puntos
 * GPS (que llegan cada pocos segundos por WS) re-rendericen solo esta tarjeta
 * y no la página completa.
 */
export function MapaViajeCard({ viaje }: { viaje: Viaje }) {
  // Tiempo real: cambios de estado desde la app del conductor refrescan la
  // query ['viaje', id] y los puntos GPS llegan como `posicionVivo`.
  const posicionVivo = useViajeEnVivo(viaje.id);
  const viajeActivo = ESTADOS_ACTIVOS.includes(viaje.estado);

  // Última posición conocida al abrir la página (vía el endpoint público del
  // trackingToken), para no esperar al siguiente punto GPS en vivo. La key NO
  // cuelga de ['viaje', id]: la invalidación por prefijo de esa query no debe
  // re-disparar este fetch (staleTime Infinity, se siembra una vez).
  const { data: posicionInicial } = useQuery<PosicionViaje | null>({
    queryKey: ['viaje-ultima-posicion', viaje.id],
    queryFn: async () => {
      const { data } = await api.get<{
        ultimaUbicacion?: {
          lat: number;
          lng: number;
          velocidad: number | null;
          capturadoEn: string;
        } | null;
      }>(`/tracking/${viaje.trackingToken}`);
      const u = data.ultimaUbicacion;
      if (!u) return null;
      return {
        viajeId: viaje.id,
        lat: u.lat,
        lng: u.lng,
        velocidad: u.velocidad,
        capturadoEn: u.capturadoEn,
      };
    },
    enabled: Boolean(viaje.trackingToken) && viajeActivo,
    staleTime: Infinity,
  });

  const posicionConductor = viajeActivo
    ? (posicionVivo ?? posicionInicial ?? null)
    : null;

  // Ruta aproximada: hay ≥2 paradas con coordenadas pero no se trazó por
  // carretera (TomTom no pudo enganchar algún pin a una vía, o no hay key).
  const escalasConCoords = (viaje.escalas ?? []).filter(
    (e) => e.lat != null && e.lng != null,
  ).length;
  const rutaAproximada =
    escalasConCoords >= 2 &&
    !(Array.isArray(viaje.rutaGeometria) && viaje.rutaGeometria.length >= 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mapa del itinerario</CardTitle>
        <CardDescription>
          {posicionConductor ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Escalas, ruta y posición del conductor en vivo.
            </span>
          ) : (
            'Escalas y ruta en orden (origen → destino).'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rutaAproximada && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ruta aproximada en <strong>línea recta</strong>: no se pudo calcular
              por carretera. Revisa que cada parada esté sobre una vía —{' '}
              <Link href={`/viajes/${viaje.id}/editar`} className="font-medium underline">
                edita el viaje
              </Link>{' '}
              y vuelve a ubicar el pin con el buscador de direcciones (o acercando
              el mapa), luego guarda para recalcular.
            </span>
          </div>
        )}
        <div className="h-80 w-full">
          <MapaItinerario
            escalas={viaje.escalas ?? []}
            geometria={viaje.rutaGeometria ?? null}
            posicionConductor={posicionConductor}
          />
        </div>
      </CardContent>
    </Card>
  );
}
