'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { seleccionRequerida, fechaRequerida, finNoAntesDeInicio } from '@/lib/validacion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import { vencimientoInfo } from '@/components/conductores/documento-utils';
import type { DocumentoConductor, DocumentoFormPayload } from '@/components/conductores/types';
import { ArchivosDocumentoDialog } from '@/components/conductores/expediente/archivos-documento-dialog';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';
import {
  CeldaPrincipal,
  Vigencia,
  Conteo,
} from '@/components/conductores/expediente/tabla-ui';
import { isoADate } from '@/lib/fecha';

const schema = z
  .object({
    tipo: seleccionRequerida(),
    numero: z.string().trim().optional(),
    fechaEmision: z.string().optional(),
    fechaVencimiento: fechaRequerida('La fecha de vencimiento es obligatoria'),
  })
  .refine((d) => finNoAntesDeInicio(d.fechaEmision, d.fechaVencimiento), {
    path: ['fechaVencimiento'],
    message: 'El vencimiento no puede ser anterior a la emisión',
  });

type FormValues = z.infer<typeof schema>;

function DocumentoForm({
  conductorId,
  documento,
  open,
  onOpenChange,
}: {
  conductorId: string;
  documento?: DocumentoConductor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
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
    mode: 'onTouched',
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
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <ExpedienteFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={esEdicion ? 'Editar documento' : 'Nuevo documento'}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      saving={mutation.isPending}
      submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
      size="md"
    >
      <CamposGrid cols={2}>
        <Campo label="Tipo" required error={errors.tipo?.message}>
          <CatalogoSelect
            grupo="TIPO_DOCUMENTO_CONDUCTOR"
            value={tipo}
            onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
            placeholder="Selecciona un tipo"
          />
        </Campo>
        <Campo label="Número" htmlFor="doc-numero">
          <Input id="doc-numero" {...register('numero')} />
        </Campo>
        <Campo label="Fecha de emisión" htmlFor="doc-fechaEmision">
          <Input id="doc-fechaEmision" type="date" {...register('fechaEmision')} />
        </Campo>
        <Campo
          label="Fecha de vencimiento"
          htmlFor="doc-fechaVencimiento"
          required
          error={errors.fechaVencimiento?.message}
        >
          <Input id="doc-fechaVencimiento" type="date" {...register('fechaVencimiento')} />
        </Campo>
      </CamposGrid>
    </ExpedienteFormDialog>
  );
}

export function DocumentosTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<DocumentoConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [archivosDoc, setArchivosDoc] = useState<DocumentoConductor | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-documentos', conductorId],
    queryFn: async () => {
      const { data } = await api.get<DocumentoConductor[]>(
        `/conductores/${conductorId}/documentos`,
      );
      return data;
    },
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus /> Agregar documento
        </Button>
      </div>

      <DocumentoForm
        conductorId={conductorId}
        documento={editando ?? undefined}
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
      />

      <div className="overflow-auto">
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
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Documento</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Vigencia</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={<CatalogoTexto grupo="TIPO_DOCUMENTO_CONDUCTOR" codigo={doc.tipo} />}
                      subtitulo={doc.numero ? `N.º ${doc.numero}` : ''}
                    />
                  </TableCell>
                  <TableCell>
                    <Vigencia iso={doc.fechaVencimiento} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setArchivosDoc(doc)}
                        title="Archivos adjuntos"
                      >
                        <Paperclip className="h-4 w-4" />
                        {doc._count?.archivos ?? 0}
                      </Button>
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {archivosDoc && (
        <ArchivosDocumentoDialog
          conductorId={conductorId}
          documentoId={archivosDoc.id}
          titulo={archivosDoc.numero ? `${archivosDoc.tipo} · N.º ${archivosDoc.numero}` : archivosDoc.tipo}
          open={Boolean(archivosDoc)}
          onOpenChange={(o) => { if (!o) setArchivosDoc(null); }}
        />
      )}
    </div>
  );
}
