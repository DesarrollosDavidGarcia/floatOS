'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ClipboardCheck, Upload } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { useCatalogo, catalogoLabel } from '@/lib/catalogos';
import { fechaHora } from '@/lib/fecha';

type TipoRevision = 'SALIDA' | 'LLEGADA';
type EstadoItem = 'OK' | 'MAL' | 'NA';

interface ItemChecklist {
  clave: string;
  estado: EstadoItem;
  nota?: string;
}

interface Revision {
  id: string;
  tipo: TipoRevision;
  odometro: number;
  nivelCombustiblePct: number | null;
  checklist: ItemChecklist[] | null;
  novedades: string | null;
  origen: 'CONDUCTOR' | 'MONITORISTA';
  fotoTableroUrl: string | null;
  createdAt: string;
}

const TITULO: Record<TipoRevision, string> = {
  SALIDA: 'Revisión de salida',
  LLEGADA: 'Revisión de llegada',
};

const ESTADO_VARIANTE: Record<EstadoItem, 'success' | 'destructive' | 'secondary'> = {
  OK: 'success',
  MAL: 'destructive',
  NA: 'secondary',
};

/** Formulario de captura. El panel lo usa cuando el conductor no pudo. */
function CapturarDialog({
  viajeId,
  tipo,
  revision,
  open,
  onOpenChange,
}: {
  viajeId: string;
  tipo: TipoRevision;
  revision?: Revision;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: puntos } = useCatalogo('CHECKLIST_UNIDAD');
  const [odometro, setOdometro] = useState(revision ? String(revision.odometro) : '');
  const [combustible, setCombustible] = useState(
    revision?.nivelCombustiblePct != null ? String(revision.nivelCombustiblePct) : '',
  );
  const [novedades, setNovedades] = useState(revision?.novedades ?? '');
  const [items, setItems] = useState<Record<string, EstadoItem>>(
    Object.fromEntries((revision?.checklist ?? []).map((i) => [i.clave, i.estado])),
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Revision>(
        `/viajes/${viajeId}/revisiones/${tipo.toLowerCase()}`,
        {
          odometro: Number(odometro),
          nivelCombustiblePct: combustible ? Number(combustible) : undefined,
          novedades: novedades.trim() || undefined,
          checklist: Object.entries(items).map(([clave, estado]) => ({ clave, estado })),
        },
      );
      // La foto va aparte porque el alta es JSON: así el conductor puede mandar
      // la revisión aunque la imagen falle o venga después.
      if (foto) {
        const fd = new FormData();
        fd.append('foto', foto);
        await api.post(`/viajes/revisiones/${data.id}/foto`, fd, {
          headers: { 'Content-Type': undefined },
        });
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Revisión guardada');
      void qc.invalidateQueries({ queryKey: ['viaje-revisiones', viajeId] });
      void qc.invalidateQueries({ queryKey: ['viaje', viajeId, 'margen'] });
      void qc.invalidateQueries({ queryKey: ['viaje', viajeId] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const enviar = () => {
    if (!odometro || Number(odometro) < 0) {
      setError('Captura la lectura del odómetro');
      return;
    }
    setError(null);
    guardar.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{TITULO[tipo]}</DialogTitle>
          <DialogDescription>
            Captura por el conductor cuando él no pudo hacerlo. Queda registrado
            que el dato lo tomó el panel y no la app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CamposGrid cols={2}>
            <Campo label="Odómetro" htmlFor="odometro" required error={error ?? undefined}>
              <Input
                id="odometro"
                inputMode="numeric"
                value={odometro}
                onChange={(e) => setOdometro(e.target.value)}
              />
            </Campo>
            <Campo label="Combustible (%)" htmlFor="combustible">
              <Input
                id="combustible"
                inputMode="numeric"
                placeholder="0 a 100"
                value={combustible}
                onChange={(e) => setCombustible(e.target.value)}
              />
            </Campo>
          </CamposGrid>

          <div className="space-y-2">
            <p className="text-sm font-medium">Check list</p>
            <ul className="divide-y rounded-md border">
              {(puntos ?? []).filter((p) => p.activo).map((p) => (
                <li key={p.codigo} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm">{p.nombre}</span>
                  <div className="flex gap-1">
                    {(['OK', 'MAL', 'NA'] as EstadoItem[]).map((e) => (
                      <Button
                        key={e}
                        type="button"
                        size="sm"
                        variant={items[p.codigo] === e ? 'default' : 'outline'}
                        onClick={() => setItems((prev) => ({ ...prev, [p.codigo]: e }))}
                      >
                        {e}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Campo label="Novedades" htmlFor="novedades">
            <Textarea
              id="novedades"
              rows={2}
              placeholder="Golpes, fallas o cualquier detalle del estado de la unidad"
              value={novedades}
              onChange={(e) => setNovedades(e.target.value)}
            />
          </Campo>

          <Campo label="Foto del tablero" htmlFor="foto" hint="Deja auditable la lectura del odómetro.">
            <Input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </Campo>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardar.isPending}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={guardar.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {guardar.isPending ? 'Guardando…' : 'Guardar revisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevisionBloque({
  tipo,
  revision,
  onCapturar,
}: {
  tipo: TipoRevision;
  revision?: Revision;
  onCapturar: () => void;
}) {
  const { data: puntos } = useCatalogo('CHECKLIST_UNIDAD');
  const problemas = (revision?.checklist ?? []).filter((i) => i.estado === 'MAL');

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{TITULO[tipo]}</p>
        <Button size="sm" variant="outline" onClick={onCapturar}>
          {revision ? 'Corregir' : 'Capturar'}
        </Button>
      </div>

      {!revision ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Sin capturar.{' '}
          {tipo === 'SALIDA'
            ? 'El viaje no puede arrancar hasta que se capture.'
            : 'El viaje no puede cerrarse hasta que se capture.'}
        </p>
      ) : (
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular-nums">
              Odómetro <strong>{revision.odometro.toLocaleString('es-MX')}</strong>
            </span>
            {revision.nivelCombustiblePct != null && (
              <span className="text-muted-foreground">
                Combustible {revision.nivelCombustiblePct}%
              </span>
            )}
            <Badge variant={revision.origen === 'CONDUCTOR' ? 'secondary' : 'outline'}>
              {revision.origen === 'CONDUCTOR' ? 'Capturó el conductor' : 'Capturó el panel'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {fechaHora(revision.createdAt)}
            </span>
          </div>

          {problemas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {problemas.map((i) => (
                <Badge key={i.clave} variant={ESTADO_VARIANTE[i.estado]}>
                  {catalogoLabel(puntos, i.clave)}
                </Badge>
              ))}
            </div>
          )}

          {revision.novedades && (
            <p className="text-muted-foreground">{revision.novedades}</p>
          )}

          {revision.fotoTableroUrl && (
            <a
              href={revision.fotoTableroUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs underline"
            >
              <Camera className="h-3.5 w-3.5" />
              Ver foto del tablero
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Revisiones del vehículo del viaje. Son obligatorias para que el viaje avance,
 * así que aquí se ven y, si el conductor no pudo capturarlas, se registran desde
 * el panel dejando constancia de que el dato no es de primera mano.
 */
export function RevisionesCard({ viajeId }: { viajeId: string }) {
  const [capturando, setCapturando] = useState<TipoRevision | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['viaje-revisiones', viajeId],
    queryFn: async () => {
      const { data } = await api.get<Revision[]>(`/viajes/${viajeId}/revisiones`);
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const salida = data?.find((r) => r.tipo === 'SALIDA');
  const llegada = data?.find((r) => r.tipo === 'LLEGADA');

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ClipboardCheck className="h-4 w-4" />
        El odómetro de estas revisiones es el que convierte los kilómetros del
        viaje de estimados a reales.
      </p>
      <RevisionBloque tipo="SALIDA" revision={salida} onCapturar={() => setCapturando('SALIDA')} />
      <RevisionBloque tipo="LLEGADA" revision={llegada} onCapturar={() => setCapturando('LLEGADA')} />

      {capturando && (
        <CapturarDialog
          viajeId={viajeId}
          tipo={capturando}
          revision={capturando === 'SALIDA' ? salida : llegada}
          open
          onOpenChange={(v) => !v && setCapturando(null)}
        />
      )}
    </div>
  );
}
