import type { EscalaViaje } from '@/components/viajes/types';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const BASE = 'https://maps.googleapis.com/maps/api/staticmap';

/**
 * Codifica una polilínea al formato *encoded polyline* de Google (compacto, para
 * el parámetro `path=enc:` de la Static Maps API y no reventar el largo de URL).
 */
function encodePolyline(puntos: [number, number][]): string {
  let salida = '';
  let prevLat = 0;
  let prevLng = 0;
  const enc = (valor: number): string => {
    let v = valor < 0 ? ~(valor << 1) : valor << 1;
    let s = '';
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lat, lng] of puntos) {
    const iLat = Math.round(lat * 1e5);
    const iLng = Math.round(lng * 1e5);
    salida += enc(iLat - prevLat) + enc(iLng - prevLng);
    prevLat = iLat;
    prevLng = iLng;
  }
  return salida;
}

function colorMarcador(i: number, total: number): string {
  if (i === 0) return 'blue';
  if (i === total - 1) return 'red';
  return 'orange';
}

/**
 * Mapa **estático** del itinerario (imagen). Una sola petición a la Static Maps
 * API (más barata que un mapa dinámico y cacheable por el navegador), sin
 * interactividad. Se usa en viajes sin posición en vivo (entregados/cancelados).
 */
export function MapaEstatico({
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

  if (puntos.length === 0 || !KEY) {
    return (
      <div className="grid h-full place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        {puntos.length === 0
          ? 'Ninguna escala tiene coordenadas para mostrar en el mapa.'
          : 'Mapa no disponible.'}
      </div>
    );
  }

  const usaCarretera = Boolean(geometria && geometria.length >= 2);
  const trazo = usaCarretera ? (geometria as [number, number][]) : puntos;

  const partes: string[] = [
    'size=640x320',
    'scale=2',
    `path=color:0x2563ebcc|weight:3|enc:${encodePolyline(trazo)}`,
  ];
  for (let i = 0; i < puntos.length; i++) {
    const [lat, lng] = puntos[i];
    partes.push(
      `markers=color:${colorMarcador(i, puntos.length)}|${lat},${lng}`,
    );
  }
  partes.push(`key=${KEY}`);
  const url = `${BASE}?${partes.join('&')}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagen de Static Maps de Google
    <img
      src={url}
      alt="Mapa del itinerario del viaje"
      className="h-full w-full rounded-lg object-cover"
      loading="lazy"
    />
  );
}
