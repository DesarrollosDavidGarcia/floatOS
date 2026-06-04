'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { TipoDocumentoUnidad } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  ESTADO_VENCIMIENTO_BADGE,
  ESTADO_VENCIMIENTO_LABEL,
  estadoVencimiento,
  TIPO_DOCUMENTO_UNIDAD_LABEL,
  type DocumentoUnidad,
  type Unidad,
} from './types';

const schema = z.object({
  tipo: z.nativeEnum(TipoDocumentoUnidad, {
    errorMap: () => ({ message: 'Selecciona el tipo' }),
  }),
  descripcion: z.string().trim().optional(),
  fechaEmision: z.string().trim().optional(),
  fechaVencimiento: z.string().trim().min(1, 'La fecha de vencimiento es obligatoria'),
});

type FormValues = z.infer<typeof schema>;

/** Convierte una fecha ISO a 'yyyy-MM-dd' para inputs type=date. */
function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** Convierte 'yyyy-MM-dd' a ISO string. */
function toIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function fmt(iso?: string | null): string {
  if (!iso) return '—';
  return format(new Date(iso), 'dd MMM yyyy', { locale: es });
}

export function DocumentosDialog({
  unidad,
  open,
  onOpenChange,
}: {
  unidad: Unidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const unidadId = unidad?.id ?? '';
  const [editando, setEditando] = useState<DocumentoUnidad | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fechaVencimiento: '' },
  });

  const tipoSeleccionado = watch('tipo');

  const docsQuery = useQuery({
    queryKey: ['unidad-documentos', unidadId],
    queryFn: async () => {
      const { data } = await api.get<DocumentoUnidad[]>(`/unidades/${unidadId}/documentos`);
      return data;
    },
    enabled: open && Boolean(unidadId),
  });

  const queryKey = ['unidad-documentos', unidadId];

  function abrirNuevo() {
    setEditando(null);
    reset({ tipo: undefined as unknown as TipoDocumentoUnidad, descripcion: '', fechaEmision: '', fechaVencimiento: '' });
    setMostrarForm(true);
  }

  function abrirEdicion(doc: DocumentoUnidad) {
    setEditando(doc);
    reset({
      tipo: doc.tipo,
      descripcion: doc.descripcion ?? '',
      fechaEmision: toDateInput(doc.fechaEmision),
      fechaVencimiento: toDateInput(doc.fechaVencimiento),
    });
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setEditando(null);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        tipo: values.tipo,
        descripcion: values.descripcion || undefined,
        fechaEmision: values.fechaEmision ? toIso(values.fechaEmision) : undefined,
        fechaVencimiento: toIso(values.fechaVencimiento),
      };
      if (editando) {
        const { data } = await api.patch<DocumentoUnidad>(
          `/unidades/${unidadId}/documentos/${editando.id}`,
          payload,
        );
        return data;
      }
      const { data } = await api.post<DocumentoUnidad>(
        `/unidades/${unidadId}/documentos`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['unidad-documentos-por-vencer'] });
      toast.success(editando ? 'Documento actualizado' : 'Documento agregado');
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/unidades/${unidadId}/documentos/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['unidad-documentos-por-vencer'] });
      toast.success('Documento eliminado');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function handleOpenChange(value: boolean) {
    if (!value) cerrarForm();
    onOpenChange(value);
  }

  const docs = docsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Documentos {unidad ? `· ${unidad.placas}` : ''}</DialogTitle>
          <DialogDescription>
            Gestiona los documentos de la unidad y su vigencia.
          </DialogDescription>
        </DialogHeader>

        {!mostrarForm && (
          <div className="flex justify-end">
            <Button size="sm" onClick={abrirNuevo}>
              <Plus className="mr-1.5 h-4 w-4" /> Agregar documento
            </Button>
          </div>
        )}

        {mostrarForm && (
          <form
            onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
            className="space-y-4 rounded-md border p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                {editando ? 'Editar documento' : 'Nuevo documento'}
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={cerrarForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={tipoSeleccionado ?? ''}
                  onValueChange={(v) =>
                    setValue('tipo', v as TipoDocumentoUnidad, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TipoDocumentoUnidad).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_DOCUMENTO_UNIDAD_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-sm text-destructive">{errors.tipo.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" {...register('descripcion')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaEmision">Fecha de emisión</Label>
                <Input id="fechaEmision" type="date" {...register('fechaEmision')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento *</Label>
                <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
                {errors.fechaVencimiento && (
                  <p className="text-sm text-destructive">{errors.fechaVencimiento.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cerrarForm} disabled={saveMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Guardando…' : editando ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin documentos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((doc) => {
                  const estado = estadoVencimiento(doc.fechaVencimiento);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>{TIPO_DOCUMENTO_UNIDAD_LABEL[doc.tipo]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.descripcion || '—'}
                      </TableCell>
                      <TableCell>{fmt(doc.fechaEmision)}</TableCell>
                      <TableCell>{fmt(doc.fechaVencimiento)}</TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_VENCIMIENTO_BADGE[estado]}>
                          {ESTADO_VENCIMIENTO_LABEL[estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirEdicion(doc)}
                            aria-label="Editar documento"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Eliminar documento"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                            title="Eliminar documento"
                            description="Esta acción no se puede deshacer."
                            confirmLabel="Eliminar"
                            onConfirm={() => deleteMutation.mutateAsync(doc.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
