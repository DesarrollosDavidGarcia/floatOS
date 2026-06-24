'use client';

import { Fragment, useEffect } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';
import {
  CENTRO_MEXICO,
  MAPA_PROPS,
  MarcadorBadge,
  MarcadorVivo,
} from '@/components/mapa/google-maps-helpers';
import type { PosicionViaje, ViajeActivo } from './tipos';

const ZOOM_DEFAULT = 5;
const ZOOM_ENFOQUE = 13;

/** Reacciona a `enfoque` para centrar el mapa en un viaje seleccionado. */
function ControladorEnfoque({ enfoque }: { enfoque: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && enfoque) {
      map.panTo(enfoque);
      map.setZoom(ZOOM_ENFOQUE);
    }
  }, [enfoque, map]);
  return null;
}

export interface MapaProps {
  viajes: ViajeActivo[];
  posiciones: Record<string, PosicionViaje>;
  /** Coordenada a la que centrar el mapa (al hacer clic en la lista lateral). */
  enfoque: { lat: number; lng: number } | null;
}

/**
 * Mapa de Google con la flota activa. Dibuja, por cada viaje con posición
 * conocida, un marcador rojo que se actualiza en vivo, más marcadores de origen
 * y destino cuando hay coordenadas.
 */
export default function Mapa({ viajes, posiciones, enfoque }: MapaProps) {
  return (
    <Map
      defaultCenter={CENTRO_MEXICO}
      defaultZoom={ZOOM_DEFAULT}
      className="h-full w-full rounded-lg"
      {...MAPA_PROPS}
    >
      <ControladorEnfoque enfoque={enfoque} />

      {viajes.map((viaje) => {
        const nombreConductor = viaje.conductor
          ? `${viaje.conductor.nombre} ${viaje.conductor.apellidos}`.trim()
          : 'Sin conductor';
        const pos = posiciones[viaje.id];
        const velocidad =
          pos?.velocidad != null ? `\nVelocidad: ${Math.round(pos.velocidad)} km/h` : '';

        return (
          <Fragment key={viaje.id}>
            {viaje.origenLat != null && viaje.origenLng != null ? (
              <MarcadorBadge
                position={{ lat: viaje.origenLat, lng: viaje.origenLng }}
                color="#2563eb"
                contenido="dot"
                titulo={`Origen · Viaje #${viaje.folio}\n${viaje.origenDireccion}`}
              />
            ) : null}

            {viaje.destinoLat != null && viaje.destinoLng != null ? (
              <MarcadorBadge
                position={{ lat: viaje.destinoLat, lng: viaje.destinoLng }}
                color="#16a34a"
                contenido="check"
                titulo={`Destino · Viaje #${viaje.folio}\n${viaje.destinoDireccion}`}
              />
            ) : null}

            {pos ? (
              <MarcadorVivo
                position={{ lat: pos.lat, lng: pos.lng }}
                titulo={
                  `Viaje #${viaje.folio}\n${viaje.cliente?.razonSocial ?? 'Sin cliente'}` +
                  `\nConductor: ${nombreConductor}${velocidad}`
                }
              />
            ) : null}
          </Fragment>
        );
      })}
    </Map>
  );
}
