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
  buscarDireccionEstructurada,
  reverseGeocode,
  type DireccionEstructurada,
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
  const [campos, setCampos] = useState<DireccionEstructurada>({ pais: 'México' });
  const [resultados, setResultados] = useState<LugarGeocodificado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
    setCampos({ pais: 'México' });
    setResultados([]);
    setBuscado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setCampo = (k: keyof DireccionEstructurada, v: string) =>
    setCampos((c) => ({ ...c, [k]: v }));

  // Búsqueda estructurada por botón / Enter (no en cada tecla → respeta la
  // política de uso de Nominatim). Requiere al menos un campo además de país.
  async function buscar() {
    const camposBusqueda: (keyof DireccionEstructurada)[] = [
      'calle',
      'numero',
      'colonia',
      'cp',
      'municipio',
      'ciudad',
      'estado',
    ];
    if (!camposBusqueda.some((k) => campos[k]?.trim())) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBuscando(true);
    try {
      const res = await buscarDireccionEstructurada(campos, ctrl.signal);
      setResultados(res);
      setBuscado(true);
      // Posiciona el mapa en el mejor resultado para que el usuario lo revise.
      // NO confirma nada: eso ocurre solo al pulsar "Usar esta ubicación".
      // La lista queda visible por si hay que elegir otra coincidencia.
      if (res.length > 0) {
        const r = res[0];
        setPos({ lat: r.lat, lng: r.lng });
        setRecenter({ lat: r.lat, lng: r.lng });
        setDireccion(r.direccion);
      }
    } catch {
      /* abortado o error de red: se ignora */
    } finally {
      setBuscando(false);
    }
  }

  function elegirResultado(r: LugarGeocodificado) {
    setPos({ lat: r.lat, lng: r.lng });
    setRecenter({ lat: r.lat, lng: r.lng }); // solo aquí se re-centra el mapa
    setDireccion(r.direccion);
    setResultados([]);
    setBuscado(false);
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
            Llena los campos y pulsa Buscar para posicionar el mapa; revisa el pin y
            confirma con “Usar esta ubicación”. También puedes hacer clic en el mapa o
            arrastrar el pin para afinar.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
          <div className="space-y-2">
            <div
              className="grid grid-cols-2 gap-2"
              onKeyDown={(e) => {
                // Enter dispara la búsqueda (sin enviar el formulario del viaje
                // que envuelve a este diálogo).
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void buscar();
                }
              }}
            >
              <Input
                className="col-span-2"
                placeholder="Calle"
                value={campos.calle ?? ''}
                onChange={(e) => setCampo('calle', e.target.value)}
                aria-label="Calle"
              />
              <Input
                placeholder="Número"
                value={campos.numero ?? ''}
                onChange={(e) => setCampo('numero', e.target.value)}
                aria-label="Número"
              />
              <Input
                placeholder="C.P."
                value={campos.cp ?? ''}
                onChange={(e) => setCampo('cp', e.target.value)}
                aria-label="Código postal"
                inputMode="numeric"
              />
              <Input
                className="col-span-2"
                placeholder="Colonia"
                value={campos.colonia ?? ''}
                onChange={(e) => setCampo('colonia', e.target.value)}
                aria-label="Colonia"
              />
              <Input
                placeholder="Municipio"
                value={campos.municipio ?? ''}
                onChange={(e) => setCampo('municipio', e.target.value)}
                aria-label="Municipio"
              />
              <Input
                placeholder="Ciudad"
                value={campos.ciudad ?? ''}
                onChange={(e) => setCampo('ciudad', e.target.value)}
                aria-label="Ciudad"
              />
              <Input
                placeholder="Estado"
                value={campos.estado ?? ''}
                onChange={(e) => setCampo('estado', e.target.value)}
                aria-label="Estado"
              />
              <Input
                placeholder="País"
                value={campos.pais ?? ''}
                onChange={(e) => setCampo('pais', e.target.value)}
                aria-label="País"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={buscando}
              className="w-full"
              onClick={() => void buscar()}
            >
              <Search className="h-4 w-4" />
              {buscando ? 'Buscando…' : 'Buscar dirección'}
            </Button>
            {(buscando || buscado || resultados.length > 0) && (
              <div className="max-h-40 w-full overflow-y-auto rounded-md border bg-popover shadow-sm">
                {buscando && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
                )}
                {!buscando && resultados.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Sin resultados. Prueba con menos detalle (p. ej. solo calle, colonia y CP).
                  </p>
                )}
                {!buscando && resultados.length > 0 && (
                  <p className="border-b px-3 py-1.5 text-[11px] text-muted-foreground">
                    Mapa posicionado en la coincidencia más cercana. Si no es exacta,
                    elige otra o <strong>arrastra el pin</strong> al punto correcto.
                    Nada se guarda hasta “Usar esta ubicación”.
                  </p>
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

          <div className="h-[300px] w-full overflow-hidden rounded-md border">
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
