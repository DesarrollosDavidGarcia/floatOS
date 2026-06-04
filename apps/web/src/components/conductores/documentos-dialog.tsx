'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import type { Conductor, DocumentoConductor, DocumentoFormPayload } from './types';
import { vencimientoInfo } from './documento-utils';

const schema = z.object({
  tipo: z.string().min(1, 'Requerido'),
  numero: z.string().trim().optional(),
  fechaEmision: z.string().optional(),
  fechaVencimiento: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
});

type FormValues = z.infer<typeof schema>;

/** Convierte una fecha ISO a 'yyyy-MM-dd' para inputs date. */
function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function DocumentoForm({
  conductorId,
  documento,
  onDone,
}: {
  conductorId: string;
  documento?: DocumentoConductor;
  onDone: () => void;
}) {
  const esEdicion = Boolean(documento);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: documento?.tipo ?? '',
      numero: documento?.numero ?? '',
      fechaEmision: isoADate(documento?.fechaEmision),
      fechaVencimiento: isoADate(documento?.fechaVencimiento),
    },
  });

  useEffect(() => {
    reset({
      tipo: documento?.tipo ?? '',
      numero: documento?.numero ?? '',
      fechaEmision: isoADate(documento?.fechaEmision),
      fechaVencimiento: isoADate(documento?.fechaVencimiento),
    });
  }, [documento, reset]);

  const tipo = watch('tipo');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: DocumentoFormPayload = {
        tipo: values.tipo,
        fechaVencimiento: new Date(values.fechaVencimiento).toISOString(),
      };
      if (values.numero?.trim()) payload.numero = values.numero.trim();
      if (values.fechaEmision) payload.fechaEmision = new Date(values.fechaEmision).toISOString();

      if (esEdicion && documento) {
        await api.patch(`/conductores/${conductorId}/documentos/${documento.id}`, payload);
      } else {
        await api.post(`/conductores/${conductorId}/documentos`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductor-documentos', conductorId] });
      toast.success(esEdicion ? 'Documento actualizado' : 'Documento agregado');
      onDone();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-md border p-4"
    >
      <p className="text-sm font-medium">
        {esEdicion ? 'Editar documento' : 'Nuevo documento'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <CatalogoSelect
            grupo="TIPO_DOCUMENTO_CONDUCTOR"
            value={tipo}
            onChange={(c) => setValue('tipo', c)}
            placeholder="Selecciona un tipo"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...register('numero')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fechaEmision">Fecha de emisión</Label>
          <Input id="fechaEmision" type="date" {...register('fechaEmision')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
          <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
          {errors.fechaVencimiento && (
            <p className="text-sm text-destructive">{errors.fechaVencimiento.message}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : esEdicion ? 'Guardar' : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}

export function DocumentosDialog({
  conductor,
  open,
  onOpenChange,
}: {
  conductor: Conductor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<DocumentoConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditando(null);
      setMostrarForm(false);
    }
  }, [open]);

  const conductorId = conductor?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-documentos', conductorId],
    queryFn: async () => {
      const { data } = await api.get<DocumentoConductor[]>(
        `/conductores/${conductorId}/documentos`,
      );
      return data;
    },
    enabled: open && Boolean(conductorId),
  });

  const eliminar = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/conductores/${conductorId}/documentos/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductor-documentos', conductorId] });
      toast.success('Documento eliminado');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Documentos</DialogTitle>
          <DialogDescription>
            {conductor
              ? `${conductor.nombre}${conductor.apellidos ? ` ${conductor.apellidos}` : ''}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {!mostrarForm && !editando && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setMostrarForm(true)}>
              <Plus className="mr-1 h-4 w-4" /> Agregar documento
            </Button>
          </div>
        )}

        {(mostrarForm || editando) && conductorId && (
          <DocumentoForm
            conductorId={conductorId}
            documento={editando ?? undefined}
            onDone={cerrarForm}
          />
        )}

        <div className="max-h-[50vh] overflow-auto">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              No se pudieron cargar los documentos.
            </p>
          ) : !data || data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin documentos registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((doc) => {
                  const venc = vencimientoInfo(doc.fechaVencimiento);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <CatalogoTexto grupo="TIPO_DOCUMENTO_CONDUCTOR" codigo={doc.tipo} />
                      </TableCell>
                      <TableCell>{doc.numero ?? '—'}</TableCell>
                      <TableCell>
                        {format(new Date(doc.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={venc.variant}>{venc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditando(doc);
                              setMostrarForm(false);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                            title="Eliminar documento"
                            description="Esta acción no se puede deshacer."
                            confirmLabel="Eliminar"
                            onConfirm={() => eliminar.mutateAsync(doc.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
