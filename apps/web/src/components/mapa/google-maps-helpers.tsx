'use client';

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

export type LatLng = { lat: number; lng: number };

/** Centro por defecto: México. */
export const CENTRO_MEXICO: LatLng = { lat: 23.6, lng: -102.5 };

/**
 * Props comunes del componente <Map> en el proyecto: scroll-zoom directo,
 * sin Street View ni selector de tipo de mapa (UI mínima). Se usa con spread.
 */
export const MAPA_PROPS = {
  gestureHandling: 'greedy' as const,
  disableDefaultUI: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

/**
 * Ajusta el encuadre del mapa a los puntos dados: centra si es uno solo, o
 * fitBounds si son varios. Recalcula solo cuando cambia la lista de puntos.
 */
export function Encuadrar({
  puntos,
  zoomPuntoUnico = 13,
  padding = 48,
}: {
  puntos: LatLng[];
  zoomPuntoUnico?: number;
  padding?: number;
}) {
  const map = useMap();
  const firma = puntos.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (!map || puntos.length === 0) return;
    if (puntos.length === 1) {
      map.setCenter(puntos[0]);
      map.setZoom(zoomPuntoUnico);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    puntos.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, padding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, firma, zoomPuntoUnico, padding]);
  return null;
}

// ─────────────────────────── marcadores (badge) ───────────────────────────

/** Contenido interno del badge: un número (texto), un punto o una palomita. */
export type ContenidoBadge = 'dot' | 'check' | (string & {});

/** SVG interno según el contenido (texto numérico, punto u check). */
function interiorBadge(contenido: ContenidoBadge): string {
  if (contenido === 'dot') {
    return '<circle cx="20" cy="20" r="4.5" fill="#ffffff"/>';
  }
  if (contenido === 'check') {
    return (
      '<path d="M14.5 20.4 l3.4 3.4 l7.2 -7.6" fill="none" stroke="#ffffff" ' +
      'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    );
  }
  return (
    `<text x="20" y="20.5" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" ` +
    `fill="#ffffff">${contenido}</text>`
  );
}

/** Data-URI del badge circular: relleno de color, borde blanco y sombra suave. */
function badgeUrl(color: string, contenido: ContenidoBadge): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#0f172a" flood-opacity="0.4"/>' +
    '</filter></defs>' +
    `<circle cx="20" cy="20" r="13" fill="${color}" stroke="#ffffff" stroke-width="3" filter="url(#sh)"/>` +
    interiorBadge(contenido) +
    '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/** Gestiona un google.maps.Marker imperativo con un icono dado. */
function useMarcador(
  position: LatLng,
  icon: () => google.maps.Icon,
  titulo: string | undefined,
  deps: unknown[],
) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const marker = new google.maps.Marker({
      map,
      position,
      title: titulo,
      icon: icon(),
    });
    return () => marker.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position.lat, position.lng, titulo, ...deps]);
}

/**
 * Marcador tipo *badge* circular (plano, borde blanco, sombra) con un número,
 * un punto (origen) o una palomita (destino) dentro.
 */
export function MarcadorBadge({
  position,
  color,
  contenido,
  titulo,
}: {
  position: LatLng;
  color: string;
  contenido: ContenidoBadge;
  titulo?: string;
}) {
  useMarcador(
    position,
    () => ({
      url: badgeUrl(color, contenido),
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    }),
    titulo,
    [color, contenido],
  );
  return null;
}

/** Punto "en vivo": halo translúcido + núcleo sólido con borde blanco. */
function vivoUrl(color: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
    '<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%">' +
    '<feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.45"/>' +
    '</filter></defs>' +
    `<circle cx="24" cy="24" r="20" fill="${color}" opacity="0.22"/>` +
    `<circle cx="24" cy="24" r="8" fill="${color}" stroke="#ffffff" stroke-width="3" filter="url(#sh)"/>` +
    '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/** Marcador de posición en vivo (conductor): dot con halo. */
export function MarcadorVivo({
  position,
  color = '#dc2626',
  titulo,
}: {
  position: LatLng;
  color?: string;
  titulo?: string;
}) {
  useMarcador(
    position,
    () => ({
      url: vivoUrl(color),
      scaledSize: new google.maps.Size(48, 48),
      anchor: new google.maps.Point(24, 24),
    }),
    titulo,
    [color],
  );
  return null;
}

// ─────────────────────────── polilínea ───────────────────────────

/**
 * Polilínea de la ruta. Sólida → estilo "pro" con *casing* (línea blanca más
 * ancha debajo + color encima), como las rutas de Google/Uber. Punteada →
 * aproximación geodésica (sin casing). `path` debe ser estable (memoizado).
 */
export function Polilinea({
  path,
  color,
  weight = 5,
  opacity = 0.95,
  punteada = false,
}: {
  path: LatLng[];
  color: string;
  weight?: number;
  opacity?: number;
  punteada?: boolean;
}) {
  const map = useMap();
  const ref = useRef<google.maps.Polyline[]>([]);
  useEffect(() => {
    if (!map) return;
    const lineas: google.maps.Polyline[] = [];
    if (punteada) {
      lineas.push(
        new google.maps.Polyline({
          map,
          path,
          zIndex: 2,
          strokeOpacity: 0,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: opacity,
                strokeColor: color,
                strokeWeight: weight,
                scale: 3,
              },
              offset: '0',
              repeat: '12px',
            },
          ],
        }),
      );
    } else {
      // Casing blanco (debajo) + trazo de color (encima).
      lineas.push(
        new google.maps.Polyline({
          map,
          path,
          zIndex: 1,
          strokeColor: '#ffffff',
          strokeWeight: weight + 4,
          strokeOpacity: 0.9,
        }),
        new google.maps.Polyline({
          map,
          path,
          zIndex: 2,
          strokeColor: color,
          strokeWeight: weight,
          strokeOpacity: opacity,
        }),
      );
    }
    ref.current = lineas;
    return () => {
      lineas.forEach((l) => l.setMap(null));
      ref.current = [];
    };
  }, [map, path, color, weight, opacity, punteada]);
  return null;
}
