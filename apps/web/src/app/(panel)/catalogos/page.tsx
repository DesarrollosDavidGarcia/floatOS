'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CatalogoGrupoMeta, CatalogoItem } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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

const COLORES = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'];

/** Etiquetas legibles (es) para los colores de badge del catálogo. */
const COLOR_LABEL: Record<string, string> = {
  default: 'Azul',
  secondary: 'Gris',
  destructive: 'Rojo',
  outline: 'Contorno',
  success: 'Verde',
  warning: 'Ámbar',
};

interface FormState {
  codigo: string;
  nombre: string;
  orden: string;
  color: string;
  activo: boolean;
}

const FORM_VACIO: FormState = {
  codigo: '',
  nombre: '',
  orden: '0',
  color: '',
  activo: true,
};

export default function CatalogosPage() {
  const queryClient = useQueryClient();
  const [grupoSel, setGrupoSel] = useState<string | null>(null);
  const [editando, setEditando] = useState<CatalogoItem | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);

  const { data: grupos } = useQuery({
    queryKey: ['catalogo-grupos'],
    queryFn: async () => {
      const { data } = await api.get<CatalogoGrupoMeta[]>('/catalogos/grupos');
      return data;
    },
  });

  const grupo = grupoSel ?? grupos?.[0]?.grupo ?? null;
  const grupoMeta = useMemo(
    () => grupos?.find((g) => g.grupo === grupo),
    [grupos, grupo],
  );

  const { data: items, isLoading } = useQuery({
    queryKey: ['catalogo', grupo],
    queryFn: async () => {
      const { data } = await api.get<CatalogoItem[]>(`/catalogos/${grupo}`);
      return data;
    },
    enabled: Boolean(grupo),
  });

  function resetForm() {
    setEditando(null);
    setMostrarForm(false);
    setForm(FORM_VACIO);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...FORM_VACIO, orden: String(items?.length ?? 0) });
    setMostrarForm(true);
  }

  function abrirEditar(item: CatalogoItem) {
    setEditando(item);
    setForm({
      codigo: item.codigo,
      nombre: item.nombre,
      orden: String(item.orden),
      color: item.color ?? '',
      activo: item.activo,
    });
    setMostrarForm(true);
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        orden: Number(form.orden) || 0,
        color: form.color || undefined,
        activo: form.activo,
      };
      if (editando) {
        await api.patch(`/catalogos/${grupo}/${editando.id}`, payload);
      } else {
        await api.post(`/catalogos/${grupo}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', grupo] });
      toast.success(editando ? 'Opción actualizada' : 'Opción agregada');
      resetForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalogos/${grupo}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', grupo] });
      toast.success('Opción eliminada');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogos"
        description="Administra las opciones de los menús del sistema. Lo que agregues aquí aparece en los formularios sin tocar código."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        {/* Grupos */}
        <div className="space-y-1 rounded-md border p-2">
          {!grupos ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            grupos.map((g) => (
              <button
                key={g.grupo}
                onClick={() => {
                  setGrupoSel(g.grupo);
                  resetForm();
                }}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                  g.grupo === grupo
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {g.nombre}
              </button>
            ))
          )}
        </div>

        {/* Items del grupo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{grupoMeta?.nombre ?? '—'}</h2>
            {!mostrarForm && (
              <Button size="sm" onClick={abrirNuevo} disabled={!grupo}>
                <Plus /> Agregar opción
              </Button>
            )}
          </div>

          {mostrarForm && (
            <div className="space-y-4 rounded-md border p-4">
              <p className="text-sm font-medium">
                {editando ? 'Editar opción' : 'Nueva opción'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    placeholder="EJ_CODIGO"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre visible</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Examen general"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: e.target.value })}
                  />
                </div>
                {grupoMeta?.coloreable && (
                  <div className="space-y-1.5">
                    <Label>Color (badge)</Label>
                    <Select
                      value={form.color || undefined}
                      onValueChange={(v) => setForm({ ...form, color: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un color" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {COLOR_LABEL[c] ?? c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={form.activo ? 'si' : 'no'}
                    onValueChange={(v) => setForm({ ...form, activo: v === 'si' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Activa</SelectItem>
                      <SelectItem value="no">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={guardar.isPending || !form.codigo.trim() || !form.nombre.trim()}
                  onClick={() => guardar.mutate()}
                >
                  {guardar.isPending ? 'Guardando…' : editando ? 'Guardar' : 'Agregar'}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Orden</TableHead>
                  {grupoMeta?.coloreable && <TableHead>Color</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !items || items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Sin opciones. Agrega la primera.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell>{item.orden}</TableCell>
                      {grupoMeta?.coloreable && (
                        <TableCell>
                          {item.color ? (
                            <Badge variant={item.color as never}>
                              {COLOR_LABEL[item.color] ?? item.color}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={item.activo ? 'success' : 'secondary'}>
                          {item.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar opción"
                            onClick={() => abrirEditar(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Eliminar opción">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                            title="Eliminar opción"
                            description={`¿Eliminar "${item.nombre}"? Los registros que ya la usen conservarán el valor, pero dejará de aparecer en los menús.`}
                            confirmLabel="Eliminar"
                            onConfirm={() => eliminar.mutateAsync(item.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
