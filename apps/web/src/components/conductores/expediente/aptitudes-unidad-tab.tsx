'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { CatalogoBadge, CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── tipos ──────────────────────────────────────────────────────────────────────

interface AptitudUnidadConductor {
  id: string;
  conductorId: string;
  tipoUnidad: string;
  nivel: string;
  aniosExperiencia: number | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipoUnidad: z.string().min(1, 'Requerido'),
  nivel: z.string().optional(),
  aniosExperiencia: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── formulario modal ───────────────────────────────────────────────────────────

function AptitudForm({
  conductorId,
  aptitud,
  open,
  onOpenChange,
}: {
  conductorId: string;
  aptitud?: AptitudUnidadConductor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
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
      tipoUnidad: aptitud?.tipoUnidad ?? '',
      nivel: aptitud?.nivel ?? '',
      aniosExperiencia:
        aptitud?.aniosExperiencia != null
          ? String(aptitud.aniosExperiencia)
          : '',
      notas: aptitud?.notas ?? '',
    },
  });

  useEffect(() => {
    reset({
      tipoUnidad: aptitud?.tipoUnidad ?? '',
      nivel: aptitud?.nivel ?? '',
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
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <ExpedienteFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={esEdicion ? 'Editar aptitud' : 'Nueva aptitud'}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      saving={mutation.isPending}
      submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
      size="md"
    >
      <CamposGrid cols={2}>
        <Campo label="Tipo de unidad" error={errors.tipoUnidad?.message}>
          <CatalogoSelect
            grupo="TIPO_UNIDAD_MANEJO"
            value={tipoUnidad}
            onChange={(c) => setValue('tipoUnidad', c)}
            placeholder="Selecciona un tipo"
          />
        </Campo>
        <Campo label="Nivel">
          <CatalogoSelect
            grupo="NIVEL_APTITUD"
            value={nivel ?? ''}
            onChange={(c) => setValue('nivel', c)}
            placeholder="Selecciona un nivel"
          />
        </Campo>
        <Campo label="Años de experiencia" htmlFor="aniosExperiencia">
          <Input
            id="aniosExperiencia"
            type="number"
            min={0}
            {...register('aniosExperiencia')}
          />
        </Campo>
        <Campo label="Notas" htmlFor="notas" full>
          <textarea
            id="notas"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('notas')}
          />
        </Campo>
      </CamposGrid>
    </ExpedienteFormDialog>
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
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar aptitud
        </Button>
      </div>

      <AptitudForm
        conductorId={conductorId}
        aptitud={editando ?? undefined}
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
                  <TableCell>
                    <CatalogoTexto grupo="TIPO_UNIDAD_MANEJO" codigo={aptitud.tipoUnidad} />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="NIVEL_APTITUD" codigo={aptitud.nivel} />
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
