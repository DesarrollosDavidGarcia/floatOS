'use client';

import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PosicionViaje, ViajeActivo } from './tipos';

/** Centro por defecto: México. */
const CENTRO_MEXICO: [number, number] = [23.6, -102.5];
const ZOOM_DEFAULT = 5;
const ZOOM_ENFOQUE = 13;

/**
 * divIcon ligero (sin imágenes) para marcar origen/destino. Evita el problema
 * clásico de assets de Leaflet que no cargan con el bundler.
 */
function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'flotaos-pin',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const ICON_ORIGEN = pinIcon('#2563eb'); // azul
const ICON_DESTINO = pinIcon('#16a34a'); // verde

/** Reacciona a `enfoque` para centrar el mapa en un viaje seleccionado. */
function ControladorEnfoque({ enfoque }: { enfoque: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (enfoque) {
      map.setView([enfoque.lat, enfoque.lng], ZOOM_ENFOQUE, { animate: true });
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
 * Mapa Leaflet con OpenStreetMap. Dibuja, por cada viaje activo con posición
 * conocida, un CircleMarker que se actualiza en vivo, más marcadores de origen
 * y destino cuando hay coordenadas.
 *
 * IMPORTANTE: este componente usa `window` (Leaflet) — debe montarse con
 * next/dynamic({ ssr: false }) desde la page.
 */
export default function Mapa({ viajes, posiciones, enfoque }: MapaProps) {
  return (
    <MapContainer
      center={CENTRO_MEXICO}
      zoom={ZOOM_DEFAULT}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ControladorEnfoque enfoque={enfoque} />

      {viajes.map((viaje) => {
        const nombreConductor = viaje.conductor
          ? `${viaje.conductor.nombre} ${viaje.conductor.apellidos}`.trim()
          : 'Sin conductor';
        const pos = posiciones[viaje.id];

        return (
          <div key={viaje.id}>
            {/* Origen */}
            {viaje.origenLat != null && viaje.origenLng != null ? (
              <Marker
                position={[viaje.origenLat, viaje.origenLng]}
                icon={ICON_ORIGEN}
              >
                <Popup>
                  <strong>Origen · Viaje #{viaje.folio}</strong>
                  <br />
                  {viaje.origenDireccion}
                </Popup>
              </Marker>
            ) : null}

            {/* Destino */}
            {viaje.destinoLat != null && viaje.destinoLng != null ? (
              <Marker
                position={[viaje.destinoLat, viaje.destinoLng]}
                icon={ICON_DESTINO}
              >
                <Popup>
                  <strong>Destino · Viaje #{viaje.folio}</strong>
                  <br />
                  {viaje.destinoDireccion}
                </Popup>
              </Marker>
            ) : null}

            {/* Posición en vivo del conductor */}
            {pos ? (
              <CircleMarker
                center={[pos.lat, pos.lng]}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: '#dc2626',
                  fillOpacity: 0.95,
                }}
              >
                <Popup>
                  <strong>Viaje #{viaje.folio}</strong>
                  <br />
                  {viaje.cliente?.razonSocial ?? 'Sin cliente'}
                  <br />
                  Conductor: {nombreConductor}
                  {pos.velocidad != null ? (
                    <>
                      <br />
                      Velocidad: {Math.round(pos.velocidad)} km/h
                    </>
                  ) : null}
                </Popup>
              </CircleMarker>
            ) : null}
          </div>
        );
      })}
    </MapContainer>
  );
}
