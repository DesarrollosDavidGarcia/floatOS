'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CENTRO_MEXICO: [number, number] = [23.6, -102.5];

const PIN = L.divIcon({
  className: 'flotaos-pin',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#dc2626;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function Recentrar({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, Math.max(map.getZoom(), 14), { animate: true });
  }, [pos, map]);
  return null;
}

function Clicks({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Mapa interno del selector de ubicación (Leaflet + OSM). Marcador arrastrable y
 * clic para colocar. Usa `window`, por lo que debe montarse con next/dynamic ssr:false.
 */
export default function MapPickerLeaflet({
  value,
  recenter,
  onPick,
}: {
  /** Posición del marcador (cambia también al arrastrar). */
  value: { lat: number; lng: number } | null;
  /** Punto al que centrar la vista (solo cambia al elegir un resultado de búsqueda). */
  recenter: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : CENTRO_MEXICO}
      zoom={value ? 14 : 5}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-md"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicks onPick={onPick} />
      <Recentrar pos={recenter ? [recenter.lat, recenter.lng] : null} />
      {value ? (
        <Marker
          position={[value.lat, value.lng]}
          icon={PIN}
          draggable
          eventHandlers={{
            dragend(e) {
              const ll = (e.target as L.Marker).getLatLng();
              onPick(ll.lat, ll.lng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
