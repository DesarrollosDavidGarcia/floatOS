'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPickerDialog } from '@/components/mapa/map-picker-dialog';

export interface Sucursal {
  id: string;
  nombre: string;
  rfc?: string | null;
  calle?: string | null;
  numeroExt?: string | null;
  numeroInt?: string | null;
  colonia?: string | null;
  cp?: string | null;
  municipio?: string | null;
  estado?: string | null;
  pais?: string | null;
  lat?: number | null;
  lng?: number | null;
  esPrincipal: boolean;
}

const CAMPOS = [
  'nombre', 'rfc', 'calle', 'numeroExt', 'numeroInt',
  'colonia', 'cp', 'municipio', 'estado', 'pais',
] as const;
type Campo = (typeof CAMPOS)[number];
type FormState = Record<Campo, string>;

const VACIO: FormState = {
  nombre: '', rfc: '', calle: '', numeroExt: '', numeroInt: '',
  colonia: '', cp: '', municipio: '', estado: '', pais: 'México',
};

function domicilioResumen(s: Sucursal): string {
  return [
    [s.calle, s.numeroExt].filter(Boolean).join(' '),
    s.colonia,
    s.cp,
    [s.municipio, s.estado].filter(Boolean).join(', '),
  ]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' · ');
}

function CampoInput({
  label,
  value,
  onChange,
  className = '',
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function SucursalDialog({
  clienteId,
  sucursal,
  open,
  onOpenChange,
}: {
  clienteId: string;
  sucursal?: Sucursal;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const esEdicion = Boolean(sucursal);
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(VACIO);
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      CAMPOS.reduce(
        (acc, k) => ({ ...acc, [k]: (sucursal?.[k] as string | null) ?? (k === 'pais' ? 'México' : '') }),
        {} as FormState,
      ),
    );
    setEsPrincipal(sucursal?.esPrincipal ?? false);
    setCoords(
      sucursal?.lat != null && sucursal?.lng != null
        ? { lat: sucursal.lat, lng: sucursal.lng }
        : null,
    );
  }, [open, sucursal]);

  const set = (k: Campo, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        esPrincipal,
        lat: coords?.lat,
        lng: coords?.lng,
      };
      if (esEdicion && sucursal) {
        await api.patch(`/clientes/${clienteId}/sucursales/${sucursal.id}`, payload);
      } else {
        await api.post(`/clientes/${clienteId}/sucursales`, payload);
      }
    },
    onSuccess: () => {
      toast.success(esEdicion ? 'Sucursal actualizada' : 'Sucursal agregada');
      qc.invalidateQueries({ queryKey: ['sucursales', clienteId] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <CampoInput
            label="Nombre *"
            value={form.nombre}
            onChange={(v) => set('nombre', v)}
            className="col-span-2"
            placeholder="Matriz, Bodega Norte…"
          />
          <CampoInput label="RFC" value={form.rfc} onChange={(v) => set('rfc', v.toUpperCase())} />
          <CampoInput label="C.P." value={form.cp} onChange={(v) => set('cp', v)} inputMode="numeric" />
          <CampoInput label="Calle" value={form.calle} onChange={(v) => set('calle', v)} className="col-span-2" />
          <CampoInput label="Núm. ext." value={form.numeroExt} onChange={(v) => set('numeroExt', v)} />
          <CampoInput label="Núm. int." value={form.numeroInt} onChange={(v) => set('numeroInt', v)} />
          <CampoInput label="Colonia" value={form.colonia} onChange={(v) => set('colonia', v)} className="col-span-2" />
          <CampoInput label="Municipio" value={form.municipio} onChange={(v) => set('municipio', v)} />
          <CampoInput label="Ciudad/Estado" value={form.estado} onChange={(v) => set('estado', v)} />
          <CampoInput label="País" value={form.pais} onChange={(v) => set('pais', v)} />
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setMapOpen(true)}>
              <MapPin className="h-4 w-4" />
              {coords ? 'Cambiar ubicación' : 'Ubicar en mapa'}
            </Button>
          </div>
        </div>

        {coords && (
          <p className="text-xs text-muted-foreground">
            Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={esPrincipal} onChange={(e) => setEsPrincipal(e.target.checked)} />
          Marcar como sucursal principal
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={guardar.isPending || !form.nombre.trim()}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending ? 'Guardando…' : esEdicion ? 'Guardar' : 'Agregar'}
          </Button>
        </DialogFooter>

        <MapPickerDialog
          open={mapOpen}
          onOpenChange={setMapOpen}
          titulo="Ubicación de la sucursal"
          inicial={{ lat: coords?.lat, lng: coords?.lng }}
          onConfirm={(u) => setCoords({ lat: u.lat, lng: u.lng })}
        />
      </DialogContent>
    </Dialog>
  );
}

export function SucursalesClienteSection({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Sucursal | null>(null);
  const [nueva, setNueva] = useState(false);

  const { data, isLoading } = useQuery<Sucursal[]>({
    queryKey: ['sucursales', clienteId],
    queryFn: async () => (await api.get<Sucursal[]>(`/clientes/${clienteId}/sucursales`)).data,
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clientes/${clienteId}/sucursales/${id}`);
    },
    onSuccess: () => {
      toast.success('Sucursal eliminada');
      qc.invalidateQueries({ queryKey: ['sucursales', clienteId] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sucursales
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setNueva(true)}>
          <Plus className="h-4 w-4" /> Agregar sucursal
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin sucursales. Agrega las direcciones de recolección/entrega del cliente.
        </p>
      ) : (
        <ul className="divide-y">
          {data.map((s) => (
            <li key={s.id} className="flex items-start gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {s.nombre}
                  {s.esPrincipal && (
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      <Star className="h-3 w-3 fill-current" /> Principal
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {domicilioResumen(s) || 'Sin domicilio'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Editar"
                onClick={() => setEditando(s)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="ghost" size="icon" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="Eliminar sucursal"
                description={`¿Eliminar "${s.nombre}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                onConfirm={() => eliminar.mutateAsync(s.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <SucursalDialog
        clienteId={clienteId}
        open={nueva}
        onOpenChange={setNueva}
      />
      {editando && (
        <SucursalDialog
          clienteId={clienteId}
          sucursal={editando}
          open={Boolean(editando)}
          onOpenChange={(o) => { if (!o) setEditando(null); }}
        />
      )}
    </section>
  );
}
