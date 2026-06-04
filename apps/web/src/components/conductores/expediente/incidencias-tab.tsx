'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoBadge, CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Incidencia {
  id: string;
  conductorId: string;
  viajeId: string | null;
  tipo: string;
  gravedad: string;
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
  tipo: string;
  gravedad: string;
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
  tipo: '',
  gravedad: '',
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

// ── Tab principal ────────────────────────────────────────────────────────────

export function IncidenciasTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Incidencia | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eliminarTarget, setEliminarTarget] = useState<Incidencia | null>(null);

  const [form, setForm] = useState<FormState>({ ...FORM_EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const esEdicion = Boolean(editando);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function abrirNuevo() {
    setForm({ ...FORM_EMPTY });
    setErrors({});
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEdicion(inc: Incidencia) {
    setForm({
      tipo: inc.tipo,
      gravedad: inc.gravedad,
      titulo: inc.titulo,
      descripcion: inc.descripcion ?? '',
      fecha: isoADate(inc.fecha),
      lugar: inc.lugar ?? '',
      costoEstimado: inc.costoEstimado ?? '',
      resuelta: String(inc.resuelta),
      evidenciaKey: inc.evidenciaKey ?? '',
      registradoPor: inc.registradoPor ?? '',
      viajeId: inc.viajeId ?? '',
    });
    setErrors({});
    setEditando(inc);
    setMostrarForm(false);
  }

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
    setErrors({});
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.titulo.trim()) e.titulo = 'El título es obligatorio';
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-incidencias', conductorId],
    queryFn: async () => {
      const { data } = await api.get<Incidencia[]>(
        `/conductores/${conductorId}/incidencias`,
      );
      return data;
    },
  });

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

      if (esEdicion && editando) {
        await api.patch(
          `/conductores/${conductorId}/incidencias/${editando.id}`,
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
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <div className="space-y-4">
      {/* Botón Agregar siempre visible arriba a la derecha */}
      <div className="flex justify-end">
        <Button size="sm" onClick={abrirNuevo}>
          <Plus className="mr-1 h-4 w-4" /> Agregar incidencia
        </Button>
      </div>

      {/* Modal crear / editar */}
      <ExpedienteFormDialog
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        title={esEdicion ? 'Editar incidencia' : 'Nueva incidencia'}
        onSubmit={handleSubmit}
        saving={mutation.isPending}
        submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
        size="lg"
      >
        <CamposGrid cols={2}>
          {/* Tipo */}
          <Campo label="Tipo">
            <CatalogoSelect
              grupo="TIPO_INCIDENCIA"
              value={form.tipo}
              onChange={(c) => set('tipo', c)}
              placeholder="Selecciona…"
            />
          </Campo>

          {/* Gravedad */}
          <Campo label="Gravedad">
            <CatalogoSelect
              grupo="GRAVEDAD_INCIDENCIA"
              value={form.gravedad}
              onChange={(c) => set('gravedad', c)}
              placeholder="Selecciona…"
            />
          </Campo>

          {/* Título */}
          <Campo label="Título *" htmlFor="titulo" error={errors.titulo} full>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
            />
          </Campo>

          {/* Fecha */}
          <Campo label="Fecha *" htmlFor="fecha" error={errors.fecha}>
            <Input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
            />
          </Campo>

          {/* Lugar */}
          <Campo label="Lugar" htmlFor="lugar">
            <Input
              id="lugar"
              value={form.lugar}
              onChange={(e) => set('lugar', e.target.value)}
            />
          </Campo>

          {/* Costo estimado */}
          <Campo label="Costo estimado" htmlFor="costoEstimado">
            <Input
              id="costoEstimado"
              type="number"
              min="0"
              step="0.01"
              value={form.costoEstimado}
              onChange={(e) => set('costoEstimado', e.target.value)}
            />
          </Campo>

          {/* Resuelta */}
          <Campo label="Resuelta">
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
          </Campo>

          {/* Registrado por */}
          <Campo label="Registrado por" htmlFor="registradoPor">
            <Input
              id="registradoPor"
              value={form.registradoPor}
              onChange={(e) => set('registradoPor', e.target.value)}
            />
          </Campo>

          {/* Evidencia key */}
          <Campo label="Clave de evidencia" htmlFor="evidenciaKey">
            <Input
              id="evidenciaKey"
              value={form.evidenciaKey}
              onChange={(e) => set('evidenciaKey', e.target.value)}
            />
          </Campo>

          {/* Descripción */}
          <Campo label="Descripción" htmlFor="descripcion" full>
            <textarea
              id="descripcion"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </Campo>
        </CamposGrid>
      </ExpedienteFormDialog>

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
                    <CatalogoTexto grupo="TIPO_INCIDENCIA" codigo={inc.tipo} />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="GRAVEDAD_INCIDENCIA" codigo={inc.gravedad} />
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
                        onClick={() => abrirEdicion(inc)}
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
