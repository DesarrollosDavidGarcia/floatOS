'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { FileText, Pencil } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { formatearMoneda } from '@/lib/estado-cotizacion';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Viaje } from '@/components/viajes/types';
import {
  PARAMS_COTIZACION_DEFAULT,
  type Cotizacion,
  type ParamsCotizacion,
  type ResultadoCotizacion,
} from './types';

const CAMPOS: Array<{ key: keyof ParamsCotizacion; label: string }> = [
  { key: 'tarifaBase', label: 'Flete base ($)' },
  { key: 'precioPorKm', label: 'Precio por km ($)' },
  { key: 'precioPorKg', label: 'Precio por kg ($)' },
  { key: 'precioDiesel', label: 'Precio diésel ($/L)' },
  { key: 'rendimientoKmL', label: 'Rendimiento (km/L)' },
  { key: 'casetas', label: 'Casetas ($)' },
  { key: 'maniobrasPorEscala', label: 'Maniobras x escala ($)' },
  { key: 'margenPct', label: 'Margen (%)' },
];

export function CotizarDialog({
  viaje,
  cotizacion,
}: {
  viaje: Viaje;
  cotizacion?: Cotizacion;
}) {
  const esEdicion = !!cotizacion;
  const inicial = (): ParamsCotizacion =>
    cotizacion
      ? { ...PARAMS_COTIZACION_DEFAULT, ...cotizacion.params }
      : PARAMS_COTIZACION_DEFAULT;
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<ParamsCotizacion>(inicial);
  const [notas, setNotas] = useState(cotizacion?.notas ?? '');
  const qc = useQueryClient();

  const datos = {
    distanciaKm: Number(viaje.distanciaEstimadaKm ?? 0),
    pesoKg: Number(viaje.pesoMaxKg ?? viaje.pesoKg ?? 0),
    numEscalas: viaje.escalas?.length ?? 0,
  };

  const claveParams = useDebounce(JSON.stringify(params), 500);
  const { data: preview } = useQuery<ResultadoCotizacion>({
    queryKey: ['cotizar-calcular', viaje.id, claveParams],
    queryFn: async () => {
      const { data } = await api.post<ResultadoCotizacion>('/cotizaciones/calcular', {
        params: JSON.parse(claveParams),
        datos,
      });
      return data;
    },
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const body = { params, notas: notas.trim() || undefined };
      const { data } =
        esEdicion && cotizacion
          ? await api.patch(`/cotizaciones/${cotizacion.id}`, body)
          : await api.post(`/viajes/${viaje.id}/cotizaciones`, body);
      return data;
    },
    onSuccess: () => {
      toast.success(esEdicion ? 'Cotización actualizada' : 'Cotización creada');
      qc.invalidateQueries({ queryKey: ['cotizaciones', viaje.id] });
      invalidarViajes(qc, viaje.id);
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setParams(inicial());
      setNotas(cotizacion?.notas ?? '');
    }
  }

  const set = (key: keyof ParamsCotizacion, value: number | boolean) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {esEdicion ? (
          <Button variant="outline" size="sm">
            <Pencil />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <FileText />
            Nueva cotización
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion && cotizacion
              ? `Editar cotización #${cotizacion.folio}`
              : 'Nueva cotización'}
          </DialogTitle>
          <DialogDescription>
            Viaje #{viaje.folio} · {datos.distanciaKm} km · {datos.pesoKg} kg ·{' '}
            {datos.numEscalas} escala(s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label htmlFor={c.key}>{c.label}</Label>
              <Input
                id={c.key}
                type="number"
                min={0}
                step="0.01"
                value={params[c.key] as number}
                onChange={(e) => set(c.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={params.aplicaIva}
              onChange={(e) => set('aplicaIva', e.target.checked)}
            />
            IVA 16%
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={params.aplicaRetencion}
              onChange={(e) => set('aplicaRetencion', e.target.checked)}
            />
            Retención 4% (flete)
          </label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Condiciones, vigencia…" />
        </div>

        {/* Desglose en vivo */}
        {preview ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <ul className="space-y-1">
              {preview.lineas.map((l, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {l.concepto}
                    {l.pasaCosto ? (
                      <span className="text-xs font-medium text-amber-600"> · a costo</span>
                    ) : null}
                    {l.detalle ? (
                      <span className="text-xs text-muted-foreground"> · {l.detalle}</span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">{formatearMoneda(l.monto)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 space-y-1 border-t pt-2 text-muted-foreground">
              <Renglon label="Subtotal conceptos" valor={preview.subtotalConceptos} />
              <Renglon label={`Margen ${params.margenPct}% (s/ servicio)`} valor={preview.margen} />
              <Renglon label="Subtotal" valor={preview.subtotal} />
              {preview.iva > 0 && <Renglon label="IVA 16%" valor={preview.iva} />}
              {preview.retencion > 0 && (
                <Renglon label="Retención 4%" valor={-preview.retencion} />
              )}
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatearMoneda(preview.total)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Calculando desglose…</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={guardar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
            {guardar.isPending
              ? 'Guardando…'
              : esEdicion
                ? 'Guardar cambios'
                : 'Guardar cotización'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Renglon({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tabular-nums">{formatearMoneda(valor)}</span>
    </div>
  );
}
