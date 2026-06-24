'use client';

import { useMemo } from 'react';
import { Map } from '@vis.gl/react-google-maps';
import {
  Encuadrar,
  MarcadorBadge,
  MarcadorVivo,
  Polilinea,
  type ContenidoBadge,
  type LatLng,
} from '@/components/mapa/google-maps-helpers';
import type { EscalaViaje } from './types';
import type { PosicionViaje } from '@/components/tracking/tipos';

const ZOOM_INICIAL = 6;

function colorEscala(index: number, total: number): string {
  if (index === 0) return '#2563eb'; // origen — azul
  if (index === total - 1) return '#16a34a'; // destino — verde
  return '#d97706'; // intermedia — ámbar
}

/**
 * Mapa del itinerario (Google Maps): cada escala con coordenadas es un marcador
 * numerado y la ruta es una polilínea. Si llega `geometria` (ruta por carretera),
 * la traza siguiendo los caminos (azul sólido); si no, une las escalas con líneas
 * punteadas (aproximación). `posicionConductor` pinta la posición GPS en vivo.
 */
export default function MapaItinerario({
  escalas,
  geometria,
  posicionConductor,
}: {
  escalas: EscalaViaje[];
  geometria?: [number, number][] | null;
  posicionConductor?: PosicionViaje | null;
}) {
  const conCoords = useMemo(
    () =>
      [...escalas]
        .sort((a, b) => a.orden - b.orden)
        .filter((e) => e.lat != null && e.lng != null),
    [escalas],
  );
  const puntos = useMemo<LatLng[]>(
    () => conCoords.map((e) => ({ lat: e.lat as number, lng: e.lng as number })),
    [conCoords],
  );

  // Ruta por carretera si viene; si no, las escalas en línea recta (aproximación).
  const usaCarretera = Boolean(geometria && geometria.length >= 2);
  const trazo = useMemo<LatLng[]>(
    () =>
      usaCarretera
        ? (geometria as [number, number][]).map(([lat, lng]) => ({ lat, lng }))
        : puntos,
    [usaCarretera, geometria, puntos],
  );

  if (puntos.length === 0) {
    return (
      <div className="grid h-full place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Ninguna escala tiene coordenadas para mostrar en el mapa.
      </div>
    );
  }

  return (
    <Map
      defaultCenter={puntos[0]}
      defaultZoom={ZOOM_INICIAL}
      className="h-full w-full rounded-lg"
      gestureHandling="greedy"
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
    >
      <Encuadrar puntos={puntos} />

      {/* Ruta real: azul sólida con casing. Aproximación geodésica: ámbar punteada. */}
      <Polilinea
        path={trazo}
        color={usaCarretera ? '#2563eb' : '#d97706'}
        punteada={!usaCarretera}
      />

      {conCoords.map((e, i) => {
        // Origen = punto, destino = palomita, intermedias = número de parada.
        const contenido: ContenidoBadge =
          i === 0 ? 'dot' : i === conCoords.length - 1 ? 'check' : String(e.orden + 1);
        return (
          <MarcadorBadge
            key={e.id}
            position={{ lat: e.lat as number, lng: e.lng as number }}
            color={colorEscala(i, conCoords.length)}
            contenido={contenido}
            titulo={`${e.orden + 1}. ${e.accion}\n${e.direccion}`}
          />
        );
      })}

      {posicionConductor ? (
        <MarcadorVivo
          position={{ lat: posicionConductor.lat, lng: posicionConductor.lng }}
          titulo={
            'Posición del conductor' +
            (posicionConductor.velocidad != null
              ? `\nVelocidad: ${Math.round(posicionConductor.velocidad)} km/h`
              : '')
          }
        />
      ) : null}
    </Map>
  );
}
