'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
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
import { vencimientoInfo } from '@/lib/vencimiento';
import { fechaCorta, isoADate, dateAIso } from '@/lib/fecha';

/** Forma mínima común de un documento (conductor o unidad). */
export interface DocumentoBase {
  id: string;
  tipo: string;
  fechaEmision?: string | null;
  fechaVencimiento: string;
}

const schema = z.object({
  tipo: z.string().min(1, 'Selecciona el tipo'),
  extra: z.string().trim().optional(),
  fechaEmision: z.string().trim().optional(),
  fechaVencimiento: z
    .string()
    .trim()
    .min(1, 'La fecha de vencimiento es obligatoria'),
});

type FormValues = z.infer<typeof schema>;

export interface DocumentosDialogBaseProps<T extends DocumentoBase> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Subtítulo del diálogo (p. ej. placas de la unidad o nombre del conductor). */
  subtitulo?: string;
  descripcion?: string;
  /** Id de la entidad dueña (conductor o unidad); si falta, no se consulta. */
  entidadId?: string;
  /** Ruta base del recurso documentos, p. ej. `/unidades/<id>/documentos`. */
  basePath: (entidadId: string) => string;
  /** Clave de query del listado. */
  queryKey: (entidadId: string) => unknown[];
  /** Claves adicionales a invalidar tras guardar/eliminar (p. ej. "por vencer"). */
  invalidarAdicional?: unknown[][];
  /** Grupo de catálogo para el tipo de documento. */
  catalogoGrupo: string;
  /** Campo de texto libre extra (nombre real en el API + etiqueta visible). */
  campoExtra: { name: string; label: string };
  /**
   * Si se define, el archivo subido para "Autollenar con IA" se guarda tras
   * crear/actualizar el documento (best-effort). Cada recurso decide DÓNDE:
   * conductor lo adjunta al documento; unidad lo guarda en su área general.
   * Si se omite, el archivo de IA solo se usa para leer y no se almacena.
   */
  guardarArchivoIa?: (file: File, docId: string) => Promise<void>;
}

/**
 * Diálogo genérico de documentos (CRUD + tabla con vigencia). Lo usan el de
 * conductor y el de unidad parametrizando catálogo, ruta, queryKey y el campo
 * de texto libre (numero/descripcion). La vigencia usa la regla escalonada única.
 */
export function DocumentosDialogBase<T extends DocumentoBase>({
  open,
  onOpenChange,
  subtitulo,
  descripcion,
  entidadId,
  basePath,
  queryKey,
  invalidarAdicional = [],
  catalogoGrupo,
  campoExtra,
  guardarArchivoIa,
}: DocumentosDialogBaseProps<T>) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<T | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const archivoIaRef = useRef<HTMLInputElement>(null);
  // Archivo subido para "Autollenar con IA"; se adjunta al guardar (si aplica).
  const [archivoIa, setArchivoIa] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: '', extra: '', fechaEmision: '', fechaVencimiento: '' },
  });

  const tipo = watch('tipo');

  useEffect(() => {
    if (!open) {
      setEditando(null);
      setMostrarForm(false);
      setArchivoIa(null);
    }
  }, [open]);

  const llaveLista = entidadId ? queryKey(entidadId) : [];

  const { data, isLoading, isError } = useQuery({
    queryKey: llaveLista,
    queryFn: async () => {
      const { data } = await api.get<T[]>(basePath(entidadId as string));
      return data;
    },
    enabled: open && Boolean(entidadId),
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: llaveLista });
    for (const key of invalidarAdicional) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setArchivoIa(null);
    reset({ tipo: '', extra: '', fechaEmision: '', fechaVencimiento: '' });
    setMostrarForm(true);
  }

  function abrirEdicion(doc: T) {
    setEditando(doc);
    setArchivoIa(null);
    reset({
      tipo: doc.tipo,
      extra: ((doc as Record<string, unknown>)[campoExtra.name] as string) ?? '',
      fechaEmision: isoADate(doc.fechaEmision),
      fechaVencimiento: isoADate(doc.fechaVencimiento),
    });
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setEditando(null);
    setArchivoIa(null);
  }

  const guardar = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        fechaVencimiento: dateAIso(values.fechaVencimiento),
      };
      if (values.extra?.trim()) payload[campoExtra.name] = values.extra.trim();
      if (values.fechaEmision) payload.fechaEmision = dateAIso(values.fechaEmision);

      const base = basePath(entidadId as string);
      let docId: string;
      if (editando) {
        await api.patch(`${base}/${editando.id}`, payload);
        docId = editando.id;
      } else {
        const { data } = await api.post<{ id: string }>(base, payload);
        docId = data.id;
      }

      // Guarda el archivo leído por la IA (best-effort: si falla, el documento
      // ya quedó guardado, así que no rompemos el flujo). El DÓNDE lo decide el
      // consumidor vía `guardarArchivoIa` (adjunto del doc / área de la unidad).
      if (guardarArchivoIa && archivoIa) {
        try {
          await guardarArchivoIa(archivoIa, docId);
        } catch (err) {
          toast.warning(
            `Documento guardado, pero no se pudo guardar el archivo: ${apiError(err)}`,
          );
        }
      }
    },
    onSuccess: () => {
      invalidar();
      toast.success(editando ? 'Documento actualizado' : 'Documento agregado');
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`${basePath(entidadId as string)}/${docId}`);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Documento eliminado');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  /**
   * Extracción con IA: sube una foto del documento al backend, que devuelve
   * número y fechas para prellenar el formulario. El humano siempre revisa.
   */
  const extraerIa = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('archivo', file);
      if (tipo) fd.append('tipo', tipo);
      const { data } = await api.post<{
        numero: string | null;
        fechaEmision: string | null;
        fechaVencimiento: string | null;
        confianza: 'alta' | 'media' | 'baja';
        advertencias: string[];
      }>('/ai/documentos/extraer', fd, {
        headers: { 'Content-Type': undefined },
      });
      return data;
    },
    onSuccess: (d) => {
      let aplico = false;
      if (d.fechaVencimiento) {
        setValue('fechaVencimiento', d.fechaVencimiento, { shouldValidate: true });
        aplico = true;
      }
      if (d.fechaEmision) {
        setValue('fechaEmision', d.fechaEmision);
        aplico = true;
      }
      if (d.numero && !watch('extra')?.trim()) {
        setValue('extra', d.numero);
        aplico = true;
      }
      if (aplico) {
        toast.success(
          `Datos extraídos (confianza ${d.confianza}). Revísalos antes de guardar.`,
        );
      } else {
        toast.info('No se pudieron leer datos. Captura los campos a mano.');
      }
      if (d.advertencias?.length) {
        toast.warning(d.advertencias.join(' · '));
      }
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onArchivoIa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (file) {
      setArchivoIa(file); // se adjuntará al guardar (si el recurso lo soporta)
      extraerIa.mutate(file);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) cerrarForm();
    onOpenChange(value);
  }

  const docs = data ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Documentos{subtitulo ? ` · ${subtitulo}` : ''}</DialogTitle>
          {descripcion ? (
            <DialogDescription>{descripcion}</DialogDescription>
          ) : null}
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
            onSubmit={handleSubmit((values) => guardar.mutate(values))}
            className="space-y-4 rounded-md border p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                {editando ? 'Editar documento' : 'Nuevo documento'}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar formulario"
                onClick={cerrarForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/40 p-3">
              <input
                ref={archivoIaRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={onArchivoIa}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => archivoIaRef.current?.click()}
                disabled={extraerIa.isPending}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {extraerIa.isPending ? 'Leyendo documento…' : 'Autollenar con IA'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Sube una foto (JPG/PNG/WEBP) o un PDF y la IA prellenará número y fechas. Revísalos.
                {guardarArchivoIa ? ' El archivo se guardará.' : ''}
              </span>
              {guardarArchivoIa && archivoIa ? (
                <span className="w-full text-xs text-muted-foreground">
                  Se adjuntará: <span className="font-medium">{archivoIa.name}</span>
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <CatalogoSelect
                  grupo={catalogoGrupo}
                  value={tipo ?? ''}
                  onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
                  placeholder="Selecciona el tipo"
                  ariaLabel="Tipo de documento"
                />
                {errors.tipo && (
                  <p className="text-sm text-destructive">{errors.tipo.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra">{campoExtra.label}</Label>
                <Input id="extra" {...register('extra')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaEmision">Fecha de emisión</Label>
                <Input id="fechaEmision" type="date" {...register('fechaEmision')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento *</Label>
                <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
                {errors.fechaVencimiento && (
                  <p className="text-sm text-destructive">
                    {errors.fechaVencimiento.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cerrarForm}
                disabled={guardar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : editando ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>{campoExtra.label}</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    No se pudieron cargar los documentos.
                  </TableCell>
                </TableRow>
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin documentos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((doc) => {
                  const venc = vencimientoInfo(doc.fechaVencimiento);
                  const extra = (doc as Record<string, unknown>)[campoExtra.name] as
                    | string
                    | null
                    | undefined;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <CatalogoTexto grupo={catalogoGrupo} codigo={doc.tipo} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {extra || '—'}
                      </TableCell>
                      <TableCell>{fechaCorta(doc.fechaEmision)}</TableCell>
                      <TableCell>{fechaCorta(doc.fechaVencimiento)}</TableCell>
                      <TableCell>
                        <Badge variant={venc.variant}>
                          {venc.estado === 'vigente' ? 'Vigente' : venc.label}
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
                            onConfirm={() => eliminar.mutateAsync(doc.id)}
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
