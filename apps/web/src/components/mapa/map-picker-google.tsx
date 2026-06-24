'use client';

import { useEffect, useRef } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { CENTRO_MEXICO, MAPA_PROPS } from './google-maps-helpers';

type Coord = { lat: number; lng: number };

/**
 * Marcador arrastrable + clic en el mapa para colocar. Gestiona el marcador
 * imperativamente y reporta la posición vía `onPick`. El callback se guarda en un
 * ref para que los listeners no se recreen aunque el padre pase una función nueva.
 */
function PinArrastrable({
  value,
  recenter,
  onPick,
}: {
  value: Coord | null;
  recenter: Coord | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Crea el marcador y los listeners una sola vez por instancia de mapa.
  useEffect(() => {
    if (!map) return;
    const marker = new google.maps.Marker({
      map,
      draggable: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#dc2626',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
    markerRef.current = marker;

    const onDrag = marker.addListener('dragend', () => {
      const p = marker.getPosition();
      if (p) onPickRef.current(p.lat(), p.lng());
    });
    const onClick = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onPickRef.current(e.latLng.lat(), e.latLng.lng());
    });

    return () => {
      onDrag.remove();
      onClick.remove();
      marker.setMap(null);
      markerRef.current = null;
    };
  }, [map]);

  // Posiciona/oculta el marcador según el valor actual.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (value) {
      marker.setPosition(value);
      marker.setVisible(true);
    } else {
      marker.setVisible(false);
    }
  }, [value?.lat, value?.lng]);

  // Re-centra solo cuando cambia `recenter` (elegir un resultado de búsqueda).
  useEffect(() => {
    if (map && recenter) {
      map.panTo(recenter);
      map.setZoom(Math.max(map.getZoom() ?? 14, 14));
    }
  }, [map, recenter?.lat, recenter?.lng]);

  return null;
}

/**
 * Mapa interno del selector de ubicación (Google Maps). Marcador arrastrable y
 * clic para colocar. Mismas props que el picker anterior de Leaflet.
 */
export default function MapPickerGoogle({
  value,
  recenter,
  onPick,
}: {
  value: Coord | null;
  recenter: Coord | null;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <Map
      defaultCenter={value ?? CENTRO_MEXICO}
      defaultZoom={value ? 14 : 5}
      className="h-full w-full rounded-md"
      {...MAPA_PROPS}
    >
      <PinArrastrable value={value} recenter={recenter} onPick={onPick} />
    </Map>
  );
}
