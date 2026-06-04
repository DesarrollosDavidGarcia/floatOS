'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { NivelAptitud, TipoUnidadManejo } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ConfirmDialog } from '@/components/confirm-dialog';

// ── tipos ──────────────────────────────────────────────────────────────────────

interface AptitudUnidadConductor {
  id: string;
  conductorId: string;
  tipoUnidad: TipoUnidadManejo;
  nivel: NivelAptitud;
  aniosExperiencia: number | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── etiquetas ──────────────────────────────────────────────────────────────────

const TIPO_UNIDAD_LABEL: Record<TipoUnidadManejo, string> = {
  [TipoUnidadManejo.TRACTOCAMION]: 'Tractocamión',
  [TipoUnidadManejo.TORTON]: 'Tortón',
  [TipoUnidadManejo.RABON]: 'Rabón',
  [TipoUnidadManejo.THORTON]: 'Thorton',
  [TipoUnidadManejo.CAMION_3_5]: 'Camión 3.5 t',
  [TipoUnidadManejo.CAMIONETA]: 'Camioneta',
  [TipoUnidadManejo.CAJA_SECA]: 'Caja seca',
  [TipoUnidadManejo.CAJA_REFRIGERADA]: 'Caja refrigerada',
  [TipoUnidadManejo.PLATAFORMA]: 'Plataforma',
  [TipoUnidadManejo.TOLVA]: 'Tolva',
  [TipoUnidadManejo.PIPA]: 'Pipa',
  [TipoUnidadManejo.FULL]: 'Full',
  [TipoUnidadManejo.OTRO]: 'Otro',
};

const NIVEL_APTITUD_LABEL: Record<NivelAptitud, string> = {
  [NivelAptitud.PRINCIPIANTE]: 'Principiante',
  [NivelAptitud.INTERMEDIO]: 'Intermedio',
  [NivelAptitud.EXPERTO]: 'Experto',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

function nivelVariant(nivel: NivelAptitud): BadgeVariant {
  switch (nivel) {
    case NivelAptitud.EXPERTO:
      return 'success';
    case NivelAptitud.INTERMEDIO:
      return 'secondary';
    case NivelAptitud.PRINCIPIANTE:
      return 'outline';
  }
}

const TIPOS_UNIDAD = Object.values(TipoUnidadManejo);
const NIVELES = Object.values(NivelAptitud);

// ── schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipoUnidad: z.nativeEnum(TipoUnidadManejo),
  nivel: z.nativeEnum(NivelAptitud).optional(),
  aniosExperiencia: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── formulario inline ──────────────────────────────────────────────────────────

function AptitudForm({
  conductorId,
  aptitud,
  onDone,
}: {
  conductorId: string;
  aptitud?: AptitudUnidadConductor;
  onDone: () => void;
}) {
  const esEdicion = Boolean(aptitud);
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
      tipoUnidad: aptitud?.tipoUnidad ?? TipoUnidadManejo.TRACTOCAMION,
      nivel: aptitud?.nivel ?? NivelAptitud.INTERMEDIO,
      aniosExperiencia:
        aptitud?.aniosExperiencia != null
          ? String(aptitud.aniosExperiencia)
          : '',
      notas: aptitud?.notas ?? '',
    },
  });

  useEffect(() => {
    reset({
      tipoUnidad: aptitud?.tipoUnidad ?? TipoUnidadManejo.TRACTOCAMION,
      nivel: aptitud?.nivel ?? NivelAptitud.INTERMEDIO,
      aniosExperiencia:
        aptitud?.aniosExperiencia != null
          ? String(aptitud.aniosExperiencia)
          : '',
      notas: aptitud?.notas ?? '',
    });
  }, [aptitud, reset]);

  const tipoUnidad = watch('tipoUnidad');
  const nivel = watch('nivel');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipoUnidad: values.tipoUnidad,
      };
      if (values.nivel) payload.nivel = values.nivel;
      if (values.aniosExperiencia?.trim()) {
        payload.aniosExperiencia = Number(values.aniosExperiencia);
      }
      if (values.notas?.trim()) payload.notas = values.notas.trim();

      if (esEdicion && aptitud) {
        await api.patch(
          `/conductores/${conductorId}/aptitudes-unidad/${aptitud.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/aptitudes-unidad`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-aptitudes-unidad', conductorId],
      });
      toast.success(esEdicion ? 'Aptitud actualizada' : 'Aptitud agregada');
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
        {esEdicion ? 'Editar aptitud' : 'Nueva aptitud'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de unidad</Label>
          <Select
            value={tipoUnidad}
            onValueChange={(v) => setValue('tipoUnidad', v as TipoUnidadManejo)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_UNIDAD.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_UNIDAD_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipoUnidad && (
            <p className="text-sm text-destructive">{errors.tipoUnidad.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Nivel</Label>
          <Select
            value={nivel ?? NivelAptitud.INTERMEDIO}
            onValueChange={(v) => setValue('nivel', v as NivelAptitud)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un nivel" />
            </SelectTrigger>
            <SelectContent>
              {NIVELES.map((n) => (
                <SelectItem key={n} value={n}>
                  {NIVEL_APTITUD_LABEL[n]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aniosExperiencia">Años de experiencia</Label>
          <Input
            id="aniosExperiencia"
            type="number"
            min={0}
            {...register('aniosExperiencia')}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notas">Notas</Label>
          <textarea
            id="notas"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('notas')}
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

// ── tab principal ──────────────────────────────────────────────────────────────

export function AptitudesTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<AptitudUnidadConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-aptitudes-unidad', conductorId],
    queryFn: async () => {
      const { data } = await api.get<AptitudUnidadConductor[]>(
        `/conductores/${conductorId}/aptitudes-unidad`,
      );
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (aptitudId: string) => {
      await api.delete(`/conductores/${conductorId}/aptitudes-unidad/${aptitudId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-aptitudes-unidad', conductorId],
      });
      toast.success('Aptitud eliminada');
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
            <Plus className="mr-1 h-4 w-4" /> Agregar aptitud
          </Button>
        </div>
      )}

      {(mostrarForm || editando) && (
        <AptitudForm
          conductorId={conductorId}
          aptitud={editando ?? undefined}
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
            No se pudieron cargar las aptitudes.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin aptitudes registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de unidad</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Experiencia</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((aptitud) => (
                <TableRow key={aptitud.id}>
                  <TableCell>{TIPO_UNIDAD_LABEL[aptitud.tipoUnidad]}</TableCell>
                  <TableCell>
                    <Badge variant={nivelVariant(aptitud.nivel)}>
                      {NIVEL_APTITUD_LABEL[aptitud.nivel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {aptitud.aniosExperiencia != null
                      ? `${aptitud.aniosExperiencia} año${aptitud.aniosExperiencia === 1 ? '' : 's'}`
                      : '—'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {aptitud.notas ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(aptitud);
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
                        title="Eliminar aptitud"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(aptitud.id)}
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
