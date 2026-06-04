'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { TipoExamenMedico, ResultadoExamen } from '@flotaos/shared-types';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ExamenMedico {
  id: string;
  conductorId: string;
  tipo: TipoExamenMedico;
  resultado: ResultadoExamen;
  fechaExamen: string;
  fechaVencimiento?: string | null;
  institucion?: string | null;
  medico?: string | null;
  observaciones?: string | null;
  archivoKey?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const TIPO_EXAMEN_LABEL: Record<TipoExamenMedico, string> = {
  [TipoExamenMedico.APTITUD_PSICOFISICA]: 'Aptitud psicofsica',
  [TipoExamenMedico.ANTIDOPING]: 'Antidoping',
  [TipoExamenMedico.EXAMEN_GENERAL]: 'Examen general',
  [TipoExamenMedico.VISTA]: 'Vista',
  [TipoExamenMedico.AUDITIVO]: 'Auditivo',
  [TipoExamenMedico.OTRO]: 'Otro',
};

const RESULTADO_LABEL: Record<ResultadoExamen, string> = {
  [ResultadoExamen.APTO]: 'Apto',
  [ResultadoExamen.NO_APTO]: 'No apto',
  [ResultadoExamen.CONDICIONADO]: 'Condicionado',
  [ResultadoExamen.PENDIENTE]: 'Pendiente',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const RESULTADO_VARIANT: Record<ResultadoExamen, BadgeVariant> = {
  [ResultadoExamen.APTO]: 'default',
  [ResultadoExamen.NO_APTO]: 'destructive',
  [ResultadoExamen.CONDICIONADO]: 'secondary',
  [ResultadoExamen.PENDIENTE]: 'secondary',
};

const TIPOS = Object.values(TipoExamenMedico);
const RESULTADOS = Object.values(ResultadoExamen);

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.nativeEnum(TipoExamenMedico),
  resultado: z.nativeEnum(ResultadoExamen).optional(),
  fechaExamen: z.string().min(1, 'La fecha del examen es obligatoria'),
  fechaVencimiento: z.string().optional(),
  institucion: z.string().trim().optional(),
  medico: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
  archivoKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Form ───────────────────────────────────────────────────────────────────────

function ExamenMedicoForm({
  conductorId,
  examen,
  onDone,
}: {
  conductorId: string;
  examen?: ExamenMedico;
  onDone: () => void;
}) {
  const esEdicion = Boolean(examen);
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
      tipo: examen?.tipo ?? TipoExamenMedico.APTITUD_PSICOFISICA,
      resultado: examen?.resultado ?? ResultadoExamen.PENDIENTE,
      fechaExamen: isoADate(examen?.fechaExamen),
      fechaVencimiento: isoADate(examen?.fechaVencimiento),
      institucion: examen?.institucion ?? '',
      medico: examen?.medico ?? '',
      observaciones: examen?.observaciones ?? '',
      archivoKey: examen?.archivoKey ?? '',
    },
  });

  useEffect(() => {
    reset({
      tipo: examen?.tipo ?? TipoExamenMedico.APTITUD_PSICOFISICA,
      resultado: examen?.resultado ?? ResultadoExamen.PENDIENTE,
      fechaExamen: isoADate(examen?.fechaExamen),
      fechaVencimiento: isoADate(examen?.fechaVencimiento),
      institucion: examen?.institucion ?? '',
      medico: examen?.medico ?? '',
      observaciones: examen?.observaciones ?? '',
      archivoKey: examen?.archivoKey ?? '',
    });
  }, [examen, reset]);

  const tipo = watch('tipo');
  const resultado = watch('resultado');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        fechaExamen: new Date(values.fechaExamen).toISOString(),
      };
      if (values.resultado) payload.resultado = values.resultado;
      if (values.fechaVencimiento) {
        payload.fechaVencimiento = new Date(values.fechaVencimiento).toISOString();
      }
      if (values.institucion?.trim()) payload.institucion = values.institucion.trim();
      if (values.medico?.trim()) payload.medico = values.medico.trim();
      if (values.observaciones?.trim()) payload.observaciones = values.observaciones.trim();
      if (values.archivoKey?.trim()) payload.archivoKey = values.archivoKey.trim();

      if (esEdicion && examen) {
        await api.patch(
          `/conductores/${conductorId}/examenes-medicos/${examen.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/examenes-medicos`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-examenes-medicos', conductorId],
      });
      toast.success(esEdicion ? 'Examen actualizado' : 'Examen agregado');
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
        {esEdicion ? 'Editar examen médico' : 'Nuevo examen médico'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) => setValue('tipo', v as TipoExamenMedico)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_EXAMEN_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Resultado</Label>
          <Select
            value={resultado ?? ''}
            onValueChange={(v) => setValue('resultado', v as ResultadoExamen)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un resultado" />
            </SelectTrigger>
            <SelectContent>
              {RESULTADOS.map((r) => (
                <SelectItem key={r} value={r}>
                  {RESULTADO_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fechaExamen">Fecha del examen</Label>
          <Input id="fechaExamen" type="date" {...register('fechaExamen')} />
          {errors.fechaExamen && (
            <p className="text-sm text-destructive">{errors.fechaExamen.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
          <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="institucion">Institución</Label>
          <Input id="institucion" {...register('institucion')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="medico">Médico</Label>
          <Input id="medico" {...register('medico')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <textarea
            id="observaciones"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('observaciones')}
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

export function MedicoTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<ExamenMedico | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-examenes-medicos', conductorId],
    queryFn: async () => {
      const { data } = await api.get<ExamenMedico[]>(
        `/conductores/${conductorId}/examenes-medicos`,
      );
      return data;
    },
    enabled: Boolean(conductorId),
  });

  const eliminar = useMutation({
    mutationFn: async (examenId: string) => {
      await api.delete(`/conductores/${conductorId}/examenes-medicos/${examenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-examenes-medicos', conductorId],
      });
      toast.success('Examen eliminado');
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
            <Plus className="mr-1 h-4 w-4" /> Agregar examen
          </Button>
        </div>
      )}

      {(mostrarForm || editando) && (
        <ExamenMedicoForm
          conductorId={conductorId}
          examen={editando ?? undefined}
          onDone={cerrarForm}
        />
      )}

      <div className="overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            No se pudieron cargar los exámenes médicos.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin exámenes médicos registrados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fecha examen</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((examen) => (
                <TableRow key={examen.id}>
                  <TableCell>{TIPO_EXAMEN_LABEL[examen.tipo]}</TableCell>
                  <TableCell>
                    <Badge variant={RESULTADO_VARIANT[examen.resultado]}>
                      {RESULTADO_LABEL[examen.resultado]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(examen.fechaExamen), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {examen.fechaVencimiento ? (
                      <Badge variant="outline">
                        {format(new Date(examen.fechaVencimiento), 'dd MMM yyyy', {
                          locale: es,
                        })}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{examen.institucion ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(examen);
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
                        title="Eliminar examen médico"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(examen.id)}
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
