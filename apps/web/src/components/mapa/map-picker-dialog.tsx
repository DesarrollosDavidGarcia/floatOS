'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buscarDirecciones,
  reverseGeocode,
  type LugarGeocodificado,
} from '@/lib/geocoding';

const MapPickerLeaflet = dynamic(() => import('./map-picker-leaflet'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Cargando mapa…
    </div>
  ),
});

export interface UbicacionElegida {
  direccion: string;
  lat: number;
  lng: number;
}

/** Modal para elegir una ubicación: buscar dirección + arrastrar pin en el mapa. */
export function MapPickerDialog({
  open,
  onOpenChange,
  inicial,
  titulo = 'Elegir ubicación',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inicial?: { direccion?: string; lat?: number | null; lng?: number | null };
  titulo?: string;
  onConfirm: (u: UbicacionElegida) => void;
}) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [recenter, setRecenter] = useState<{ lat: number; lng: number } | null>(null);
  const [direccion, setDireccion] = useState('');
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<LugarGeocodificado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Evita que la dirección precargada dispare una búsqueda al abrir.
  const skipSearchRef = useRef(false);

  // Reinicia el estado al abrir; aborta peticiones en vuelo al cerrar.
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    const inicialPos =
      inicial?.lat != null && inicial?.lng != null
        ? { lat: inicial.lat, lng: inicial.lng }
        : null;
    setPos(inicialPos);
    setRecenter(inicialPos);
    setDireccion(inicial?.direccion ?? '');
    setQ(inicial?.direccion ?? '');
    setResultados([]);
    skipSearchRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Búsqueda con debounce (respeta la política de uso de Nominatim).
  useEffect(() => {
    if (!open) return;
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const term = q.trim();
    if (term.length < 3) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBuscando(true);
      try {
        setResultados(await buscarDirecciones(term, ctrl.signal));
      } catch {
        /* abortado o error de red: se ignora */
      } finally {
        setBuscando(false);
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [q, open]);

  function elegirResultado(r: LugarGeocodificado) {
    setPos({ lat: r.lat, lng: r.lng });
    setRecenter({ lat: r.lat, lng: r.lng }); // solo aquí se re-centra el mapa
    setDireccion(r.direccion);
    setResultados([]);
  }

  // Al colocar/arrastrar el pin: mueve el marcador y rellena la dirección por
  // geocodificación inversa (sin re-centrar el mapa).
  async function alColocar(lat: number, lng: number) {
    setPos({ lat, lng });
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const dir = await reverseGeocode(lat, lng, ctrl.signal).catch(() => null);
    if (dir) setDireccion(dir);
  }

  const puedeConfirmar = pos != null && direccion.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-3 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Busca la dirección o haz clic en el mapa; arrastra el pin para afinar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar dirección, ciudad, lugar…"
              className="pl-8"
              aria-label="Buscar dirección"
            />
            {(resultados.length > 0 || buscando) && (
              <div className="absolute z-[1100] mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                {buscando && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
                )}
                {resultados.map((r, i) => (
                  <button
                    key={`${r.lat}-${r.lng}-${i}`}
                    type="button"
                    onClick={() => elegirResultado(r)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">{r.direccion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-[320px] w-full overflow-hidden rounded-md border">
            <MapPickerLeaflet value={pos} recenter={recenter} onPick={alColocar} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Dirección
            </label>
            <Input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección a guardar"
            />
            {pos && (
              <p className="text-xs text-muted-foreground">
                {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!puedeConfirmar}
            onClick={() => {
              if (pos)
                onConfirm({ direccion: direccion.trim(), lat: pos.lat, lng: pos.lng });
              onOpenChange(false);
            }}
          >
            Usar esta ubicación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
