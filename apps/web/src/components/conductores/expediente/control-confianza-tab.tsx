'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { TipoControlConfianza, ResultadoExamen } from '@flotaos/shared-types';
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

interface ControlConfianza {
  id: string;
  conductorId: string;
  tipo: TipoControlConfianza;
  resultado: ResultadoExamen;
  institucion?: string | null;
  folio?: string | null;
  fechaEvaluacion: string;
  fechaVencimiento?: string | null;
  observaciones?: string | null;
  archivoKey?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const TIPO_CONTROL_LABEL: Record<TipoControlConfianza, string> = {
  [TipoControlConfianza.EXAMEN_CONFIANZA]: 'Examen de confianza',
  [TipoControlConfianza.ANTECEDENTES_NO_PENALES]: 'Antecedentes no penales',
  [TipoControlConfianza.ESTUDIO_SOCIOECONOMICO]: 'Estudio socioeconómico',
  [TipoControlConfianza.POLIGRAFO]: 'Polígrafo',
  [TipoControlConfianza.TOXICOLOGICO]: 'Toxicológico',
  [TipoControlConfianza.OTRO]: 'Otro',
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

const TIPOS = Object.values(TipoControlConfianza);
const RESULTADOS = Object.values(ResultadoExamen);

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.nativeEnum(TipoControlConfianza),
  resultado: z.nativeEnum(ResultadoExamen).optional(),
  institucion: z.string().trim().optional(),
  folio: z.string().trim().optional(),
  fechaEvaluacion: z.string().min(1, 'La fecha de evaluación es obligatoria'),
  fechaVencimiento: z.string().optional(),
  observaciones: z.string().trim().optional(),
  archivoKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Form ───────────────────────────────────────────────────────────────────────

function ControlConfianzaForm({
  conductorId,
  registro,
  onDone,
}: {
  conductorId: string;
  registro?: ControlConfianza;
  onDone: () => void;
}) {
  const esEdicion = Boolean(registro);
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
      tipo: registro?.tipo ?? TipoControlConfianza.EXAMEN_CONFIANZA,
      resultado: registro?.resultado ?? ResultadoExamen.PENDIENTE,
      institucion: registro?.institucion ?? '',
      folio: registro?.folio ?? '',
      fechaEvaluacion: isoADate(registro?.fechaEvaluacion),
      fechaVencimiento: isoADate(registro?.fechaVencimiento),
      observaciones: registro?.observaciones ?? '',
      archivoKey: registro?.archivoKey ?? '',
    },
  });

  useEffect(() => {
    reset({
      tipo: registro?.tipo ?? TipoControlConfianza.EXAMEN_CONFIANZA,
      resultado: registro?.resultado ?? ResultadoExamen.PENDIENTE,
      institucion: registro?.institucion ?? '',
      folio: registro?.folio ?? '',
      fechaEvaluacion: isoADate(registro?.fechaEvaluacion),
      fechaVencimiento: isoADate(registro?.fechaVencimiento),
      observaciones: registro?.observaciones ?? '',
      archivoKey: registro?.archivoKey ?? '',
    });
  }, [registro, reset]);

  const tipo = watch('tipo');
  const resultado = watch('resultado');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        fechaEvaluacion: new Date(values.fechaEvaluacion).toISOString(),
      };
      if (values.resultado) payload.resultado = values.resultado;
      if (values.fechaVencimiento) {
        payload.fechaVencimiento = new Date(values.fechaVencimiento).toISOString();
      }
      if (values.institucion?.trim()) payload.institucion = values.institucion.trim();
      if (values.folio?.trim()) payload.folio = values.folio.trim();
      if (values.observaciones?.trim()) payload.observaciones = values.observaciones.trim();
      if (values.archivoKey?.trim()) payload.archivoKey = values.archivoKey.trim();

      if (esEdicion && registro) {
        await api.patch(
          `/conductores/${conductorId}/control-confianza/${registro.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/control-confianza`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-control-confianza', conductorId],
      });
      toast.success(esEdicion ? 'Registro actualizado' : 'Registro agregado');
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
        {esEdicion ? 'Editar registro' : 'Nuevo registro de control de confianza'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) => setValue('tipo', v as TipoControlConfianza)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_CONTROL_LABEL[t]}
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
          <Label htmlFor="fechaEvaluacion">Fecha de evaluación</Label>
          <Input id="fechaEvaluacion" type="date" {...register('fechaEvaluacion')} />
          {errors.fechaEvaluacion && (
            <p className="text-sm text-destructive">{errors.fechaEvaluacion.message}</p>
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
          <Label htmlFor="folio">Folio</Label>
          <Input id="folio" {...register('folio')} />
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

export function ControlConfianzaTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<ControlConfianza | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-control-confianza', conductorId],
    queryFn: async () => {
      const { data } = await api.get<ControlConfianza[]>(
        `/conductores/${conductorId}/control-confianza`,
      );
      return data;
    },
    enabled: Boolean(conductorId),
  });

  const eliminar = useMutation({
    mutationFn: async (registroId: string) => {
      await api.delete(`/conductores/${conductorId}/control-confianza/${registroId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-control-confianza', conductorId],
      });
      toast.success('Registro eliminado');
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
            <Plus className="mr-1 h-4 w-4" /> Agregar registro
          </Button>
        </div>
      )}

      {(mostrarForm || editando) && (
        <ControlConfianzaForm
          conductorId={conductorId}
          registro={editando ?? undefined}
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
            No se pudieron cargar los registros de control de confianza.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin registros de control de confianza.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fecha evaluación</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell>{TIPO_CONTROL_LABEL[registro.tipo]}</TableCell>
                  <TableCell>
                    <Badge variant={RESULTADO_VARIANT[registro.resultado]}>
                      {RESULTADO_LABEL[registro.resultado]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(registro.fechaEvaluacion), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {registro.fechaVencimiento ? (
                      <Badge variant="outline">
                        {format(new Date(registro.fechaVencimiento), 'dd MMM yyyy', {
                          locale: es,
                        })}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{registro.institucion ?? '—'}</TableCell>
                  <TableCell>{registro.folio ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(registro);
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
                        title="Eliminar registro"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(registro.id)}
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
