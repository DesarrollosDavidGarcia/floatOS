'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  textoRequerido,
  seleccionRequerida,
  fechaRequerida,
} from '@/lib/validacion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface EventoLaboral {
  id: string;
  conductorId: string;
  tipo: string;
  titulo: string;
  descripcion?: string | null;
  puestoNuevo?: string | null;
  fecha: string;
  registradoPor?: string | null;
  creadoEn: string;
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: seleccionRequerida(),
  titulo: textoRequerido('El título es obligatorio'),
  fecha: fechaRequerida('La fecha es obligatoria'),
  descripcion: z.string().trim().optional(),
  puestoNuevo: z.string().trim().optional(),
  registradoPor: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Tab ────────────────────────────────────────────────────────────────────────

export function ProgresoTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<EventoLaboral | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-eventos-laborales', conductorId],
    queryFn: async () => {
      const { data } = await api.get<EventoLaboral[]>(
        `/conductores/${conductorId}/eventos-laborales`,
      );
      return data;
    },
    enabled: Boolean(conductorId),
  });

  const eliminar = useMutation({
    mutationFn: async (eventoId: string) => {
      await api.delete(`/conductores/${conductorId}/eventos-laborales/${eventoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-eventos-laborales', conductorId],
      });
      toast.success('Evento eliminado');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  // ── form interno (react-hook-form + mutación) ────────────────────────────────

  const esEdicion = Boolean(editando);

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
      tipo: '',
      titulo: '',
      fecha: '',
      descripcion: '',
      puestoNuevo: '',
      registradoPor: '',
    },
  });

  useEffect(() => {
    reset({
      tipo: editando?.tipo ?? '',
      titulo: editando?.titulo ?? '',
      fecha: isoADate(editando?.fecha),
      descripcion: editando?.descripcion ?? '',
      puestoNuevo: editando?.puestoNuevo ?? '',
      registradoPor: editando?.registradoPor ?? '',
    });
  }, [editando, mostrarForm, reset]);

  const tipo = watch('tipo');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        titulo: values.titulo,
        fecha: new Date(values.fecha).toISOString(),
      };
      if (values.descripcion?.trim()) payload.descripcion = values.descripcion.trim();
      if (values.puestoNuevo?.trim()) payload.puestoNuevo = values.puestoNuevo.trim();
      if (values.registradoPor?.trim()) payload.registradoPor = values.registradoPor.trim();

      if (esEdicion && editando) {
        await api.patch(
          `/conductores/${conductorId}/eventos-laborales/${editando.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/eventos-laborales`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-eventos-laborales', conductorId],
      });
      toast.success(esEdicion ? 'Evento actualizado' : 'Evento agregado');
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div className="space-y-4">
      {/* Botón Agregar siempre visible arriba a la derecha */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar evento
        </Button>
      </div>

      {/* Modal compacto (crear y editar) */}
      <ExpedienteFormDialog
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        title={esEdicion ? 'Editar evento laboral' : 'Nuevo evento laboral'}
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        saving={mutation.isPending}
        submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo label="Tipo" required error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_EVENTO_LABORAL"
              value={tipo}
              onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
              placeholder="Selecciona…"
            />
          </Campo>
          <Campo label="Título" htmlFor="ev-titulo" required error={errors.titulo?.message}>
            <Input id="ev-titulo" {...register('titulo')} />
          </Campo>
          <Campo label="Fecha" htmlFor="ev-fecha" required error={errors.fecha?.message}>
            <Input id="ev-fecha" type="date" {...register('fecha')} />
          </Campo>
          <Campo label="Puesto nuevo" htmlFor="ev-puestoNuevo">
            <Input id="ev-puestoNuevo" {...register('puestoNuevo')} />
          </Campo>
          <Campo label="Registrado por" htmlFor="ev-registradoPor">
            <Input id="ev-registradoPor" {...register('registradoPor')} />
          </Campo>
          <Campo label="Descripción" htmlFor="ev-descripcion" full>
            <textarea
              id="ev-descripcion"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              {...register('descripcion')}
            />
          </Campo>
        </CamposGrid>
      </ExpedienteFormDialog>

      {/* Línea de tiempo */}
      <div className="overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            No se pudo cargar la trayectoria laboral.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin eventos laborales registrados.
          </p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-6">
            {data.map((evento) => (
              <li key={evento.id} className="ml-6">
                {/* Punto en la línea de tiempo */}
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-border">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </span>

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(evento.fecha), 'dd MMM yyyy', { locale: es })}
                      </time>
                      <Badge variant="secondary">
                        <CatalogoTexto grupo="TIPO_EVENTO_LABORAL" codigo={evento.tipo} />
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug">{evento.titulo}</p>
                    {evento.puestoNuevo && (
                      <p className="text-xs text-muted-foreground">
                        Puesto: {evento.puestoNuevo}
                      </p>
                    )}
                    {evento.descripcion && (
                      <p className="text-xs text-muted-foreground">{evento.descripcion}</p>
                    )}
                    {evento.registradoPor && (
                      <p className="text-xs text-muted-foreground">
                        Registrado por: {evento.registradoPor}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditando(evento);
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
                      title="Eliminar evento laboral"
                      description="Esta acción no se puede deshacer."
                      confirmLabel="Eliminar"
                      onConfirm={() => eliminar.mutateAsync(evento.id)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
