'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Evaluacion {
  id: string;
  conductorId: string;
  periodoInicio: string;
  periodoFin: string;
  puntuacionGeneral?: number | string | null;
  puntualidad?: number | string | null;
  consumoCombustible?: number | string | null;
  cumplimientoRutas?: number | string | null;
  incidenciasPeriodo?: number | null;
  viajesCompletados?: number | null;
  comentarios?: string | null;
  evaluadoPor?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toNum(val?: number | string | null): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function puntuacionVariant(score?: number | string | null): BadgeVariant {
  const n = toNum(score);
  if (n === undefined) return 'outline';
  if (n >= 80) return 'default';
  if (n >= 60) return 'secondary';
  return 'destructive';
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  periodoInicio: z.string().min(1, 'El periodo de inicio es obligatorio'),
  periodoFin: z.string().min(1, 'El periodo de fin es obligatorio'),
  puntuacionGeneral: z.string().optional(),
  puntualidad: z.string().optional(),
  consumoCombustible: z.string().optional(),
  cumplimientoRutas: z.string().optional(),
  incidenciasPeriodo: z.string().optional(),
  viajesCompletados: z.string().optional(),
  comentarios: z.string().trim().optional(),
  evaluadoPor: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Form ───────────────────────────────────────────────────────────────────────

function EvaluacionForm({
  conductorId,
  evaluacion,
  open,
  onOpenChange,
  onDone,
}: {
  conductorId: string;
  evaluacion?: Evaluacion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const esEdicion = Boolean(evaluacion);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodoInicio: isoADate(evaluacion?.periodoInicio),
      periodoFin: isoADate(evaluacion?.periodoFin),
      puntuacionGeneral: toNum(evaluacion?.puntuacionGeneral)?.toString() ?? '',
      puntualidad: toNum(evaluacion?.puntualidad)?.toString() ?? '',
      consumoCombustible: toNum(evaluacion?.consumoCombustible)?.toString() ?? '',
      cumplimientoRutas: toNum(evaluacion?.cumplimientoRutas)?.toString() ?? '',
      incidenciasPeriodo: evaluacion?.incidenciasPeriodo?.toString() ?? '',
      viajesCompletados: evaluacion?.viajesCompletados?.toString() ?? '',
      comentarios: evaluacion?.comentarios ?? '',
      evaluadoPor: evaluacion?.evaluadoPor ?? '',
    },
  });

  useEffect(() => {
    reset({
      periodoInicio: isoADate(evaluacion?.periodoInicio),
      periodoFin: isoADate(evaluacion?.periodoFin),
      puntuacionGeneral: toNum(evaluacion?.puntuacionGeneral)?.toString() ?? '',
      puntualidad: toNum(evaluacion?.puntualidad)?.toString() ?? '',
      consumoCombustible: toNum(evaluacion?.consumoCombustible)?.toString() ?? '',
      cumplimientoRutas: toNum(evaluacion?.cumplimientoRutas)?.toString() ?? '',
      incidenciasPeriodo: evaluacion?.incidenciasPeriodo?.toString() ?? '',
      viajesCompletados: evaluacion?.viajesCompletados?.toString() ?? '',
      comentarios: evaluacion?.comentarios ?? '',
      evaluadoPor: evaluacion?.evaluadoPor ?? '',
    });
  }, [evaluacion, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        periodoInicio: new Date(values.periodoInicio).toISOString(),
        periodoFin: new Date(values.periodoFin).toISOString(),
      };
      if (values.puntuacionGeneral !== '') payload.puntuacionGeneral = Number(values.puntuacionGeneral);
      if (values.puntualidad !== '') payload.puntualidad = Number(values.puntualidad);
      if (values.consumoCombustible !== '') payload.consumoCombustible = Number(values.consumoCombustible);
      if (values.cumplimientoRutas !== '') payload.cumplimientoRutas = Number(values.cumplimientoRutas);
      if (values.incidenciasPeriodo !== '') payload.incidenciasPeriodo = Number(values.incidenciasPeriodo);
      if (values.viajesCompletados !== '') payload.viajesCompletados = Number(values.viajesCompletados);
      if (values.comentarios?.trim()) payload.comentarios = values.comentarios.trim();
      if (values.evaluadoPor?.trim()) payload.evaluadoPor = values.evaluadoPor.trim();

      if (esEdicion && evaluacion) {
        await api.patch(
          `/conductores/${conductorId}/evaluaciones/${evaluacion.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/evaluaciones`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-evaluaciones', conductorId],
      });
      toast.success(esEdicion ? 'Evaluación actualizada' : 'Evaluación agregada');
      onDone();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <ExpedienteFormDialog
      open={open}
      onOpenChange={(o) => { if (!o) onDone(); onOpenChange(o); }}
      title={esEdicion ? 'Editar evaluación' : 'Nueva evaluación'}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      saving={mutation.isPending}
      submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
      size="lg"
    >
      <CamposGrid cols={3}>
        {/* Periodo */}
        <Campo label="Periodo inicio" htmlFor="periodoInicio" error={errors.periodoInicio?.message}>
          <Input id="periodoInicio" type="date" {...register('periodoInicio')} />
        </Campo>
        <Campo label="Periodo fin" htmlFor="periodoFin" error={errors.periodoFin?.message}>
          <Input id="periodoFin" type="date" {...register('periodoFin')} />
        </Campo>

        {/* Evaluado por ocupa la 3ª columna de la primera fila */}
        <Campo label="Evaluado por" htmlFor="evaluadoPor">
          <Input id="evaluadoPor" {...register('evaluadoPor')} />
        </Campo>

        {/* KPIs numéricos */}
        <Campo label="Puntuación general (0–100)" htmlFor="puntuacionGeneral">
          <Input
            id="puntuacionGeneral"
            type="number"
            min={0}
            max={100}
            step="0.01"
            {...register('puntuacionGeneral')}
          />
        </Campo>
        <Campo label="Puntualidad" htmlFor="puntualidad">
          <Input
            id="puntualidad"
            type="number"
            min={0}
            max={100}
            step="0.01"
            {...register('puntualidad')}
          />
        </Campo>
        <Campo label="Consumo combustible (km/L)" htmlFor="consumoCombustible">
          <Input
            id="consumoCombustible"
            type="number"
            min={0}
            step="0.01"
            {...register('consumoCombustible')}
          />
        </Campo>
        <Campo label="Cumplimiento de rutas" htmlFor="cumplimientoRutas">
          <Input
            id="cumplimientoRutas"
            type="number"
            min={0}
            max={100}
            step="0.01"
            {...register('cumplimientoRutas')}
          />
        </Campo>
        <Campo label="Incidencias en el periodo" htmlFor="incidenciasPeriodo">
          <Input
            id="incidenciasPeriodo"
            type="number"
            min={0}
            step={1}
            {...register('incidenciasPeriodo')}
          />
        </Campo>
        <Campo label="Viajes completados" htmlFor="viajesCompletados">
          <Input
            id="viajesCompletados"
            type="number"
            min={0}
            step={1}
            {...register('viajesCompletados')}
          />
        </Campo>

        {/* Comentarios: fila completa */}
        <Campo label="Comentarios" htmlFor="comentarios" full>
          <textarea
            id="comentarios"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('comentarios')}
          />
        </Campo>
      </CamposGrid>
    </ExpedienteFormDialog>
  );
}

// ── Tab ────────────────────────────────────────────────────────────────────────

export function EvaluacionesTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Evaluacion | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-evaluaciones', conductorId],
    queryFn: async () => {
      const { data } = await api.get<Evaluacion[]>(
        `/conductores/${conductorId}/evaluaciones`,
      );
      return data;
    },
    enabled: Boolean(conductorId),
  });

  const eliminar = useMutation({
    mutationFn: async (evaluacionId: string) => {
      await api.delete(`/conductores/${conductorId}/evaluaciones/${evaluacionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-evaluaciones', conductorId],
      });
      toast.success('Evaluación eliminada');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar evaluación
        </Button>
      </div>

      <EvaluacionForm
        conductorId={conductorId}
        evaluacion={editando ?? undefined}
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
            No se pudieron cargar las evaluaciones.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin evaluaciones registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Puntuación</TableHead>
                <TableHead>Puntualidad</TableHead>
                <TableHead>Combustible (km/L)</TableHead>
                <TableHead>Rutas</TableHead>
                <TableHead>Incidencias</TableHead>
                <TableHead>Viajes</TableHead>
                <TableHead>Evaluado por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ev) => {
                const score = toNum(ev.puntuacionGeneral);
                return (
                  <TableRow key={ev.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(ev.periodoInicio), 'dd MMM yyyy', { locale: es })}
                      {' – '}
                      {format(new Date(ev.periodoFin), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {score !== undefined ? (
                        <Badge variant={puntuacionVariant(score)}>
                          {score.toFixed(1)}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {toNum(ev.puntualidad) !== undefined
                        ? toNum(ev.puntualidad)!.toFixed(1)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {toNum(ev.consumoCombustible) !== undefined
                        ? toNum(ev.consumoCombustible)!.toFixed(2)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {toNum(ev.cumplimientoRutas) !== undefined
                        ? toNum(ev.cumplimientoRutas)!.toFixed(1)
                        : '—'}
                    </TableCell>
                    <TableCell>{ev.incidenciasPeriodo ?? '—'}</TableCell>
                    <TableCell>{ev.viajesCompletados ?? '—'}</TableCell>
                    <TableCell>{ev.evaluadoPor ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditando(ev);
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
                          title="Eliminar evaluación"
                          description="Esta acción no se puede deshacer."
                          confirmLabel="Eliminar"
                          onConfirm={() => eliminar.mutateAsync(ev.id)}
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
    </div>
  );
}
