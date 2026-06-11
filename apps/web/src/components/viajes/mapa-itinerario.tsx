'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EscalaViaje } from './types';

const ZOOM_INICIAL = 6;
const ZOOM_PUNTO_UNICO = 13;
const PADDING_ENCUADRE: [number, number] = [30, 30];

/** Pin circular con número de escala (sin assets externos). */
function pinIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: 'flotaos-pin',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${color};color:#fff;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.35);font-size:11px;font-weight:700">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function colorEscala(index: number, total: number): string {
  if (index === 0) return '#2563eb'; // origen — azul
  if (index === total - 1) return '#16a34a'; // destino — verde
  return '#d97706'; // intermedia — ámbar
}

/** Ajusta el encuadre a todas las escalas con coordenadas. */
function Encuadrar({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) {
      map.setView(puntos[0], ZOOM_PUNTO_UNICO);
    } else if (puntos.length > 1) {
      map.fitBounds(puntos, { padding: PADDING_ENCUADRE });
    }
  }, [puntos, map]);
  return null;
}

/**
 * Mapa del itinerario: dibuja cada escala con coordenadas como marcador numerado
 * y la ruta como polilínea. Si llega `geometria` (ruta por carretera de TomTom),
 * la traza siguiendo los caminos; si no, une las escalas con líneas rectas.
 * Usa `window` (Leaflet) → montar con next/dynamic({ ssr:false }).
 */
export default function MapaItinerario({
  escalas,
  geometria,
}: {
  escalas: EscalaViaje[];
  geometria?: [number, number][] | null;
}) {
  const conCoords = [...escalas]
    .sort((a, b) => a.orden - b.orden)
    .filter((e) => e.lat != null && e.lng != null);
  const puntos = conCoords.map((e) => [e.lat as number, e.lng as number] as [number, number]);

  // Ruta por carretera si viene; si no, las escalas en línea recta (aproximación).
  const usaCarretera = Boolean(geometria && geometria.length >= 2);
  const trazo: [number, number][] = usaCarretera ? (geometria as [number, number][]) : puntos;
  // La ruta real va sólida en azul; la aproximación geodésica, punteada en ámbar.
  const estiloTrazo = usaCarretera
    ? { color: '#2563eb', weight: 3, opacity: 0.7 }
    : { color: '#d97706', weight: 3, opacity: 0.85, dashArray: '6 8' };

  if (puntos.length === 0) {
    return (
      <div className="grid h-full place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Ninguna escala tiene coordenadas para mostrar en el mapa.
      </div>
    );
  }

  return (
    <MapContainer
      center={puntos[0]}
      zoom={ZOOM_INICIAL}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Encuadrar puntos={puntos} />
      <Polyline positions={trazo} pathOptions={estiloTrazo} />
      {conCoords.map((e, i) => (
        <Marker
          key={e.id}
          position={[e.lat as number, e.lng as number]}
          icon={pinIcon(colorEscala(i, conCoords.length), String(e.orden + 1))}
        >
          <Popup>
            <strong>
              {e.orden + 1}. {e.accion}
            </strong>
            <br />
            {e.direccion}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
