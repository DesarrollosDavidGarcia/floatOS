'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { TipoIncidencia, GravedadIncidencia } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Etiquetas en español ─────────────────────────────────────────────────────

const TIPO_INCIDENCIA_LABEL: Record<TipoIncidencia, string> = {
  [TipoIncidencia.ACCIDENTE]: 'Accidente',
  [TipoIncidencia.INFRACCION]: 'Infracción',
  [TipoIncidencia.SANCION]: 'Sanción',
  [TipoIncidencia.FALTA]: 'Falta',
  [TipoIncidencia.QUEJA]: 'Queja',
  [TipoIncidencia.RECONOCIMIENTO]: 'Reconocimiento',
  [TipoIncidencia.OTRO]: 'Otro',
};

const GRAVEDAD_LABEL: Record<GravedadIncidencia, string> = {
  [GravedadIncidencia.BAJA]: 'Baja',
  [GravedadIncidencia.MEDIA]: 'Media',
  [GravedadIncidencia.ALTA]: 'Alta',
  [GravedadIncidencia.CRITICA]: 'Crítica',
};

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Incidencia {
  id: string;
  conductorId: string;
  viajeId: string | null;
  tipo: TipoIncidencia;
  gravedad: GravedadIncidencia;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  lugar: string | null;
  costoEstimado: string | null;
  resuelta: boolean;
  evidenciaKey: string | null;
  registradoPor: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

interface FormState {
  tipo: TipoIncidencia;
  gravedad: GravedadIncidencia;
  titulo: string;
  descripcion: string;
  fecha: string;
  lugar: string;
  costoEstimado: string;
  resuelta: string;
  evidenciaKey: string;
  registradoPor: string;
  viajeId: string;
}

const FORM_EMPTY: FormState = {
  tipo: TipoIncidencia.ACCIDENTE,
  gravedad: GravedadIncidencia.MEDIA,
  titulo: '',
  descripcion: '',
  fecha: '',
  lugar: '',
  costoEstimado: '',
  resuelta: 'false',
  evidenciaKey: '',
  registradoPor: '',
  viajeId: '',
};

// ── Helpers de estilo ────────────────────────────────────────────────────────

function gravedadVariant(
  g: GravedadIncidencia,
): 'destructive' | 'secondary' | 'outline' {
  if (g === GravedadIncidencia.CRITICA || g === GravedadIncidencia.ALTA)
    return 'destructive';
  if (g === GravedadIncidencia.MEDIA) return 'secondary';
  return 'outline';
}

function tipoVariant(t: TipoIncidencia): string {
  if (t === TipoIncidencia.RECONOCIMIENTO)
    return 'bg-green-100 text-green-800 border-green-200';
  return '';
}

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Formulario inline ────────────────────────────────────────────────────────

function IncidenciaForm({
  conductorId,
  incidencia,
  onDone,
}: {
  conductorId: string;
  incidencia?: Incidencia;
  onDone: () => void;
}) {
  const esEdicion = Boolean(incidencia);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(() =>
    incidencia
      ? {
          tipo: incidencia.tipo,
          gravedad: incidencia.gravedad,
          titulo: incidencia.titulo,
          descripcion: incidencia.descripcion ?? '',
          fecha: isoADate(incidencia.fecha),
          lugar: incidencia.lugar ?? '',
          costoEstimado: incidencia.costoEstimado ?? '',
          resuelta: String(incidencia.resuelta),
          evidenciaKey: incidencia.evidenciaKey ?? '',
          registradoPor: incidencia.registradoPor ?? '',
          viajeId: incidencia.viajeId ?? '',
        }
      : { ...FORM_EMPTY },
  );

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.titulo.trim()) e.titulo = 'El título es obligatorio';
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        tipo: form.tipo,
        gravedad: form.gravedad,
        titulo: form.titulo.trim(),
        fecha: new Date(form.fecha).toISOString(),
        resuelta: form.resuelta === 'true',
      };
      if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim();
      if (form.lugar.trim()) payload.lugar = form.lugar.trim();
      if (form.costoEstimado.trim())
        payload.costoEstimado = Number(form.costoEstimado);
      if (form.evidenciaKey.trim()) payload.evidenciaKey = form.evidenciaKey.trim();
      if (form.registradoPor.trim())
        payload.registradoPor = form.registradoPor.trim();
      if (form.viajeId.trim()) payload.viajeId = form.viajeId.trim();

      if (esEdicion && incidencia) {
        await api.patch(
          `/conductores/${conductorId}/incidencias/${incidencia.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/incidencias`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-incidencias', conductorId],
      });
      toast.success(esEdicion ? 'Incidencia actualizada' : 'Incidencia registrada');
      onDone();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border p-4"
    >
      <p className="text-sm font-medium">
        {esEdicion ? 'Editar incidencia' : 'Nueva incidencia'}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Tipo */}
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={form.tipo}
            onValueChange={(v) => set('tipo', v as TipoIncidencia)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TipoIncidencia).map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_INCIDENCIA_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gravedad */}
        <div className="space-y-1.5">
          <Label>Gravedad</Label>
          <Select
            value={form.gravedad}
            onValueChange={(v) => set('gravedad', v as GravedadIncidencia)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(GravedadIncidencia).map((g) => (
                <SelectItem key={g} value={g}>
                  {GRAVEDAD_LABEL[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Título */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
          />
          {errors.titulo && (
            <p className="text-sm text-destructive">{errors.titulo}</p>
          )}
        </div>

        {/* Fecha */}
        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha *</Label>
          <Input
            id="fecha"
            type="date"
            value={form.fecha}
            onChange={(e) => set('fecha', e.target.value)}
          />
          {errors.fecha && (
            <p className="text-sm text-destructive">{errors.fecha}</p>
          )}
        </div>

        {/* Lugar */}
        <div className="space-y-1.5">
          <Label htmlFor="lugar">Lugar</Label>
          <Input
            id="lugar"
            value={form.lugar}
            onChange={(e) => set('lugar', e.target.value)}
          />
        </div>

        {/* Costo estimado */}
        <div className="space-y-1.5">
          <Label htmlFor="costoEstimado">Costo estimado</Label>
          <Input
            id="costoEstimado"
            type="number"
            min="0"
            step="0.01"
            value={form.costoEstimado}
            onChange={(e) => set('costoEstimado', e.target.value)}
          />
        </div>

        {/* Resuelta */}
        <div className="space-y-1.5">
          <Label>Resuelta</Label>
          <Select
            value={form.resuelta}
            onValueChange={(v) => set('resuelta', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
          />
        </div>

        {/* Registrado por */}
        <div className="space-y-1.5">
          <Label htmlFor="registradoPor">Registrado por</Label>
          <Input
            id="registradoPor"
            value={form.registradoPor}
            onChange={(e) => set('registradoPor', e.target.value)}
          />
        </div>

        {/* Evidencia key */}
        <div className="space-y-1.5">
          <Label htmlFor="evidenciaKey">Clave de evidencia</Label>
          <Input
            id="evidenciaKey"
            value={form.evidenciaKey}
            onChange={(e) => set('evidenciaKey', e.target.value)}
          />
        </div>

        {/* Viaje ID */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="viajeId">ID de viaje relacionado</Label>
          <Input
            id="viajeId"
            value={form.viajeId}
            onChange={(e) => set('viajeId', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Guardando…'
            : esEdicion
              ? 'Guardar'
              : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}

// ── Tab principal ────────────────────────────────────────────────────────────

export function IncidenciasTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Incidencia | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eliminarTarget, setEliminarTarget] = useState<Incidencia | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-incidencias', conductorId],
    queryFn: async () => {
      const { data } = await api.get<Incidencia[]>(
        `/conductores/${conductorId}/incidencias`,
      );
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/conductores/${conductorId}/incidencias/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-incidencias', conductorId],
      });
      toast.success('Incidencia eliminada');
      setEliminarTarget(null);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Botón agregar */}
      {!mostrarForm && !editando && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setMostrarForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Agregar incidencia
          </Button>
        </div>
      )}

      {/* Formulario inline */}
      {(mostrarForm || editando) && (
        <IncidenciaForm
          conductorId={conductorId}
          incidencia={editando ?? undefined}
          onDone={cerrarForm}
        />
      )}

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-destructive">
          No se pudieron cargar las incidencias.
        </p>
      ) : !data || data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin incidencias registradas.
        </p>
      ) : (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Gravedad</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Costo est.</TableHead>
                <TableHead>Resuelta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>
                    {inc.tipo === TipoIncidencia.RECONOCIMIENTO ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tipoVariant(inc.tipo)}`}
                      >
                        {TIPO_INCIDENCIA_LABEL[inc.tipo]}
                      </span>
                    ) : (
                      <span className="text-sm">
                        {TIPO_INCIDENCIA_LABEL[inc.tipo]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={gravedadVariant(inc.gravedad)}>
                      {GRAVEDAD_LABEL[inc.gravedad]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {inc.titulo}
                  </TableCell>
                  <TableCell>{formatFecha(inc.fecha)}</TableCell>
                  <TableCell>
                    {inc.costoEstimado
                      ? `$${Number(inc.costoEstimado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={inc.resuelta ? 'outline' : 'secondary'}>
                      {inc.resuelta ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(inc);
                          setMostrarForm(false);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEliminarTarget(inc)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo de confirmación de borrado */}
      <Dialog
        open={Boolean(eliminarTarget)}
        onOpenChange={(open) => { if (!open) setEliminarTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar incidencia</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar{' '}
            <span className="font-medium">{eliminarTarget?.titulo}</span>? Esta
            acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEliminarTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={eliminar.isPending}
              onClick={() =>
                eliminarTarget && eliminar.mutate(eliminarTarget.id)
              }
            >
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
