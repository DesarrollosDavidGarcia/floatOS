'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';
import {
  CeldaPrincipal,
  Conteo,
  unirSub,
} from '@/components/conductores/expediente/tabla-ui';
import {
  textoRequerido,
  numeroOpcional,
  finNoAntesDeInicio,
} from '@/lib/validacion';

interface CapacitacionConductor {
  id: string;
  conductorId: string;
  nombre: string;
  instructor?: string | null;
  institucion?: string | null;
  horas?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  aprobado?: boolean | null;
  calificacion?: number | null;
  constanciaKey?: string | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CapacitacionFormPayload {
  nombre: string;
  instructor?: string;
  institucion?: string;
  horas?: number;
  fechaInicio?: string;
  fechaFin?: string;
  aprobado?: boolean;
  calificacion?: number;
  constanciaKey?: string;
  notas?: string;
}

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ──────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    nombre: textoRequerido('El nombre del curso es obligatorio'),
    instructor: z.string().trim().optional(),
    institucion: z.string().trim().optional(),
    horas: numeroOpcional({ min: 0, entero: true }),
    calificacion: numeroOpcional({ min: 0, max: 100 }),
    fechaInicio: z.string().optional(),
    fechaFin: z.string().optional(),
    aprobado: z.string().optional(),
    constanciaKey: z.string().trim().optional(),
    notas: z.string().trim().optional(),
  })
  .refine((d) => finNoAntesDeInicio(d.fechaInicio, d.fechaFin), {
    path: ['fechaFin'],
    message: 'No puede ser anterior a la fecha de inicio',
  });

type FormValues = z.infer<typeof schema>;

// ── Formulario modal ─────────────────────────────────────────────────────────────

function CapacitacionForm({
  conductorId,
  capacitacion,
  open,
  onOpenChange,
  onDone,
}: {
  conductorId: string;
  capacitacion?: CapacitacionConductor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const esEdicion = Boolean(capacitacion);
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
      nombre: capacitacion?.nombre ?? '',
      instructor: capacitacion?.instructor ?? '',
      institucion: capacitacion?.institucion ?? '',
      horas: capacitacion?.horas?.toString() ?? '',
      calificacion: capacitacion?.calificacion?.toString() ?? '',
      fechaInicio: isoADate(capacitacion?.fechaInicio),
      fechaFin: isoADate(capacitacion?.fechaFin),
      aprobado:
        capacitacion?.aprobado === true
          ? 'true'
          : capacitacion?.aprobado === false
            ? 'false'
            : '',
      constanciaKey: capacitacion?.constanciaKey ?? '',
      notas: capacitacion?.notas ?? '',
    },
  });

  useEffect(() => {
    reset({
      nombre: capacitacion?.nombre ?? '',
      instructor: capacitacion?.instructor ?? '',
      institucion: capacitacion?.institucion ?? '',
      horas: capacitacion?.horas?.toString() ?? '',
      calificacion: capacitacion?.calificacion?.toString() ?? '',
      fechaInicio: isoADate(capacitacion?.fechaInicio),
      fechaFin: isoADate(capacitacion?.fechaFin),
      aprobado:
        capacitacion?.aprobado === true
          ? 'true'
          : capacitacion?.aprobado === false
            ? 'false'
            : '',
      constanciaKey: capacitacion?.constanciaKey ?? '',
      notas: capacitacion?.notas ?? '',
    });
  }, [capacitacion, reset]);

  const aprobado = watch('aprobado');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: CapacitacionFormPayload = { nombre: values.nombre.trim() };
      if (values.instructor?.trim()) payload.instructor = values.instructor.trim();
      if (values.institucion?.trim()) payload.institucion = values.institucion.trim();
      if (values.horas?.trim()) payload.horas = Number(values.horas);
      if (values.fechaInicio) payload.fechaInicio = new Date(values.fechaInicio).toISOString();
      if (values.fechaFin) payload.fechaFin = new Date(values.fechaFin).toISOString();
      if (values.aprobado !== '' && values.aprobado != null)
        payload.aprobado = values.aprobado === 'true';
      if (values.calificacion?.trim()) payload.calificacion = Number(values.calificacion);
      if (values.constanciaKey?.trim()) payload.constanciaKey = values.constanciaKey.trim();
      if (values.notas?.trim()) payload.notas = values.notas.trim();

      if (esEdicion && capacitacion) {
        await api.patch(
          `/conductores/${conductorId}/capacitaciones/${capacitacion.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/capacitaciones`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-capacitaciones', conductorId],
      });
      toast.success(esEdicion ? 'Capacitación actualizada' : 'Capacitación agregada');
      onDone();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <ExpedienteFormDialog
      open={open}
      onOpenChange={(o) => { if (!o) onDone(); onOpenChange(o); }}
      title={esEdicion ? 'Editar capacitación' : 'Nueva capacitación'}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      saving={mutation.isPending}
      submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
      size="md"
    >
      <CamposGrid cols={2}>
        <Campo
          label="Nombre"
          htmlFor="cap-nombre"
          full
          required
          error={errors.nombre?.message}
        >
          <Input
            id="cap-nombre"
            placeholder="Nombre del curso"
            {...register('nombre')}
          />
        </Campo>

        <Campo label="Instructor" htmlFor="cap-instructor">
          <Input id="cap-instructor" {...register('instructor')} />
        </Campo>

        <Campo label="Institución" htmlFor="cap-institucion">
          <Input id="cap-institucion" {...register('institucion')} />
        </Campo>

        <Campo label="Horas" htmlFor="cap-horas" error={errors.horas?.message}>
          <Input
            id="cap-horas"
            type="number"
            min={0}
            {...register('horas')}
          />
        </Campo>

        <Campo
          label="Calificación"
          htmlFor="cap-calificacion"
          error={errors.calificacion?.message}
        >
          <Input
            id="cap-calificacion"
            type="number"
            step="0.01"
            min={0}
            {...register('calificacion')}
          />
        </Campo>

        <Campo label="Fecha inicio" htmlFor="cap-fechaInicio">
          <Input
            id="cap-fechaInicio"
            type="date"
            {...register('fechaInicio')}
          />
        </Campo>

        <Campo
          label="Fecha fin"
          htmlFor="cap-fechaFin"
          error={errors.fechaFin?.message}
        >
          <Input
            id="cap-fechaFin"
            type="date"
            {...register('fechaFin')}
          />
        </Campo>

        <Campo label="Aprobado">
          <Select
            value={aprobado ?? ''}
            onValueChange={(c) => setValue('aprobado', c, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin definir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Clave constancia" htmlFor="cap-constanciaKey">
          <Input id="cap-constanciaKey" {...register('constanciaKey')} />
        </Campo>

        <Campo label="Notas" htmlFor="cap-notas" full>
          <textarea
            id="cap-notas"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('notas')}
          />
        </Campo>
      </CamposGrid>
    </ExpedienteFormDialog>
  );
}

export function CapacitacionesTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<CapacitacionConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-capacitaciones', conductorId],
    queryFn: async () => {
      const { data } = await api.get<CapacitacionConductor[]>(
        `/conductores/${conductorId}/capacitaciones`,
      );
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/conductores/${conductorId}/capacitaciones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-capacitaciones', conductorId],
      });
      toast.success('Capacitación eliminada');
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
        <Conteo n={data?.length ?? 0} />
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar capacitación
        </Button>
      </div>

      <CapacitacionForm
        conductorId={conductorId}
        capacitacion={editando ?? undefined}
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        onDone={cerrarForm}
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
            No se pudieron cargar las capacitaciones.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin capacitaciones registradas.
          </p>
        ) : (
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Curso</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Horas</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Calificación</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Aprobado</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cap) => (
                <TableRow key={cap.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={cap.nombre}
                      subtitulo={unirSub(cap.institucion, cap.instructor)}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{cap.horas ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{cap.calificacion ?? '—'}</TableCell>
                  <TableCell>
                    {cap.aprobado === true ? (
                      <Badge variant="default">Sí</Badge>
                    ) : cap.aprobado === false ? (
                      <Badge variant="destructive">No</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(cap);
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
                        title="Eliminar capacitación"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(cap.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
