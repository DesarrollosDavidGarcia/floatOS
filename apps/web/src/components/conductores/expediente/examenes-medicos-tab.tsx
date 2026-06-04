'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { CatalogoBadge, CatalogoTexto } from '@/components/catalogos/catalogo-badge';
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
  SeccionHeader,
} from '@/components/conductores/expediente/form-ui';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ExamenMedico {
  id: string;
  conductorId: string;
  tipo: string;
  resultado: string;
  fechaExamen: string;
  fechaVencimiento?: string | null;
  institucion?: string | null;
  medico?: string | null;
  observaciones?: string | null;
  archivoKey?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.string().min(1, 'Requerido'),
  resultado: z.string().optional(),
  fechaExamen: z.string().min(1, 'La fecha del examen es obligatoria'),
  fechaVencimiento: z.string().optional(),
  institucion: z.string().trim().optional(),
  medico: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
  archivoKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Form Modal ─────────────────────────────────────────────────────────────────

function ExamenMedicoForm({
  conductorId,
  examen,
  open,
  onClose,
}: {
  conductorId: string;
  examen?: ExamenMedico;
  open: boolean;
  onClose: () => void;
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
      tipo: examen?.tipo ?? '',
      resultado: examen?.resultado ?? '',
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
      tipo: examen?.tipo ?? '',
      resultado: examen?.resultado ?? '',
      fechaExamen: isoADate(examen?.fechaExamen),
      fechaVencimiento: isoADate(examen?.fechaVencimiento),
      institucion: examen?.institucion ?? '',
      medico: examen?.medico ?? '',
      observaciones: examen?.observaciones ?? '',
      archivoKey: examen?.archivoKey ?? '',
    });
  }, [examen, reset]);

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
      onClose();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <ExpedienteFormDialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={esEdicion ? 'Editar examen médico' : 'Nuevo examen médico'}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      saving={mutation.isPending}
      submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
      size="md"
    >
      <CamposGrid cols={2}>
        <Campo label="Tipo">
          <CatalogoSelect
            grupo="TIPO_EXAMEN_MEDICO"
            value={watch('tipo')}
            onChange={(c) => setValue('tipo', c)}
            placeholder="Selecciona un tipo"
          />
        </Campo>

        <Campo label="Resultado">
          <CatalogoSelect
            grupo="RESULTADO_EXAMEN"
            value={watch('resultado') ?? ''}
            onChange={(c) => setValue('resultado', c)}
            placeholder="Selecciona un resultado"
          />
        </Campo>

        <Campo
          label="Fecha del examen"
          htmlFor="fechaExamen"
          error={errors.fechaExamen?.message}
        >
          <Input id="fechaExamen" type="date" {...register('fechaExamen')} />
        </Campo>

        <Campo label="Fecha de vencimiento" htmlFor="fechaVencimiento">
          <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
        </Campo>

        <Campo label="Institución" htmlFor="institucion">
          <Input id="institucion" {...register('institucion')} />
        </Campo>

        <Campo label="Médico" htmlFor="medico">
          <Input id="medico" {...register('medico')} />
        </Campo>

        <Campo label="Observaciones" htmlFor="observaciones" full>
          <textarea
            id="observaciones"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('observaciones')}
          />
        </Campo>
      </CamposGrid>
    </ExpedienteFormDialog>
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
      <SeccionHeader>
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar examen
        </Button>
      </SeccionHeader>

      <ExamenMedicoForm
        conductorId={conductorId}
        examen={editando ?? undefined}
        open={mostrarForm || Boolean(editando)}
        onClose={cerrarForm}
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
                  <TableCell>
                    <CatalogoTexto grupo="TIPO_EXAMEN_MEDICO" codigo={examen.tipo} />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="RESULTADO_EXAMEN" codigo={examen.resultado} />
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
