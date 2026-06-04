'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { TipoEventoLaboral } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface EventoLaboral {
  id: string;
  conductorId: string;
  tipo: TipoEventoLaboral;
  titulo: string;
  descripcion?: string | null;
  puestoNuevo?: string | null;
  fecha: string;
  registradoPor?: string | null;
  creadoEn: string;
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const TIPO_EVENTO_LABEL: Record<TipoEventoLaboral, string> = {
  [TipoEventoLaboral.INGRESO]: 'Ingreso',
  [TipoEventoLaboral.ASCENSO]: 'Ascenso',
  [TipoEventoLaboral.CAMBIO_PUESTO]: 'Cambio de puesto',
  [TipoEventoLaboral.CAMBIO_SALARIO]: 'Cambio de salario',
  [TipoEventoLaboral.AMONESTACION]: 'Amonestación',
  [TipoEventoLaboral.RECONOCIMIENTO]: 'Reconocimiento',
  [TipoEventoLaboral.BAJA]: 'Baja',
  [TipoEventoLaboral.OTRO]: 'Otro',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const TIPO_EVENTO_VARIANT: Record<TipoEventoLaboral, BadgeVariant> = {
  [TipoEventoLaboral.INGRESO]: 'default',
  [TipoEventoLaboral.ASCENSO]: 'default',
  [TipoEventoLaboral.CAMBIO_PUESTO]: 'secondary',
  [TipoEventoLaboral.CAMBIO_SALARIO]: 'secondary',
  [TipoEventoLaboral.AMONESTACION]: 'destructive',
  [TipoEventoLaboral.RECONOCIMIENTO]: 'default',
  [TipoEventoLaboral.BAJA]: 'destructive',
  [TipoEventoLaboral.OTRO]: 'outline',
};

const TIPOS = Object.values(TipoEventoLaboral);

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.nativeEnum(TipoEventoLaboral),
  titulo: z.string().min(1, 'El título es obligatorio'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  descripcion: z.string().trim().optional(),
  puestoNuevo: z.string().trim().optional(),
  registradoPor: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Form ───────────────────────────────────────────────────────────────────────

function EventoLaboralForm({
  conductorId,
  evento,
  onDone,
}: {
  conductorId: string;
  evento?: EventoLaboral;
  onDone: () => void;
}) {
  const esEdicion = Boolean(evento);
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
      tipo: evento?.tipo ?? TipoEventoLaboral.INGRESO,
      titulo: evento?.titulo ?? '',
      fecha: isoADate(evento?.fecha),
      descripcion: evento?.descripcion ?? '',
      puestoNuevo: evento?.puestoNuevo ?? '',
      registradoPor: evento?.registradoPor ?? '',
    },
  });

  useEffect(() => {
    reset({
      tipo: evento?.tipo ?? TipoEventoLaboral.INGRESO,
      titulo: evento?.titulo ?? '',
      fecha: isoADate(evento?.fecha),
      descripcion: evento?.descripcion ?? '',
      puestoNuevo: evento?.puestoNuevo ?? '',
      registradoPor: evento?.registradoPor ?? '',
    });
  }, [evento, reset]);

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

      if (esEdicion && evento) {
        await api.patch(
          `/conductores/${conductorId}/eventos-laborales/${evento.id}`,
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
        {esEdicion ? 'Editar evento laboral' : 'Nuevo evento laboral'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) => setValue('tipo', v as TipoEventoLaboral)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_EVENTO_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" {...register('titulo')} />
          {errors.titulo && (
            <p className="text-sm text-destructive">{errors.titulo.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" {...register('fecha')} />
          {errors.fecha && (
            <p className="text-sm text-destructive">{errors.fecha.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="puestoNuevo">Puesto nuevo</Label>
          <Input id="puestoNuevo" {...register('puestoNuevo')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registradoPor">Registrado por</Label>
          <Input id="registradoPor" {...register('registradoPor')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('descripcion')}
          />
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

  return (
    <div className="space-y-4">
      {!mostrarForm && !editando && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setMostrarForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Agregar evento
          </Button>
        </div>
      )}

      {(mostrarForm || editando) && (
        <EventoLaboralForm
          conductorId={conductorId}
          evento={editando ?? undefined}
          onDone={cerrarForm}
        />
      )}

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
                      <Badge variant={TIPO_EVENTO_VARIANT[evento.tipo]}>
                        {TIPO_EVENTO_LABEL[evento.tipo]}
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
