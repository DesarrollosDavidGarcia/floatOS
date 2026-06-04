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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoTexto, CatalogoBadge } from '@/components/catalogos/catalogo-badge';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ControlConfianza {
  id: string;
  conductorId: string;
  tipo: string;
  resultado: string;
  institucion?: string | null;
  folio?: string | null;
  fechaEvaluacion: string;
  fechaVencimiento?: string | null;
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
  institucion: z.string().trim().optional(),
  folio: z.string().trim().optional(),
  fechaEvaluacion: z.string().min(1, 'La fecha de evaluación es obligatoria'),
  fechaVencimiento: z.string().optional(),
  observaciones: z.string().trim().optional(),
  archivoKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Tab ────────────────────────────────────────────────────────────────────────

export function ControlConfianzaTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<ControlConfianza | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

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
    defaultValues: {
      tipo: '',
      resultado: '',
      institucion: '',
      folio: '',
      fechaEvaluacion: '',
      fechaVencimiento: '',
      observaciones: '',
      archivoKey: '',
    },
  });

  useEffect(() => {
    reset({
      tipo: editando?.tipo ?? '',
      resultado: editando?.resultado ?? '',
      institucion: editando?.institucion ?? '',
      folio: editando?.folio ?? '',
      fechaEvaluacion: isoADate(editando?.fechaEvaluacion),
      fechaVencimiento: isoADate(editando?.fechaVencimiento),
      observaciones: editando?.observaciones ?? '',
      archivoKey: editando?.archivoKey ?? '',
    });
  }, [editando, reset]);

  const tipo = watch('tipo');
  const resultado = watch('resultado');

  function abrirNuevo() {
    setEditando(null);
    reset({
      tipo: '',
      resultado: '',
      institucion: '',
      folio: '',
      fechaEvaluacion: '',
      fechaVencimiento: '',
      observaciones: '',
      archivoKey: '',
    });
    setMostrarForm(true);
  }

  function abrirEdicion(registro: ControlConfianza) {
    setMostrarForm(false);
    setEditando(registro);
  }

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

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

      if (esEdicion && editando) {
        await api.patch(
          `/conductores/${conductorId}/control-confianza/${editando.id}`,
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
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
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

  return (
    <div className="space-y-4">
      {/* Botón Agregar siempre visible arriba a la derecha */}
      <div className="flex justify-end">
        <Button size="sm" onClick={abrirNuevo}>
          <Plus className="mr-1 h-4 w-4" /> Agregar registro
        </Button>
      </div>

      {/* Modal crear / editar */}
      <ExpedienteFormDialog
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        title={esEdicion ? 'Editar control de confianza' : 'Nuevo control de confianza'}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        saving={mutation.isPending}
        submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          {/* Tipo */}
          <Campo label="Tipo" error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_CONTROL_CONFIANZA"
              value={tipo}
              onChange={(c) => setValue('tipo', c)}
              placeholder="Selecciona un tipo"
            />
          </Campo>

          {/* Resultado */}
          <Campo label="Resultado">
            <CatalogoSelect
              grupo="RESULTADO_EXAMEN"
              value={resultado ?? ''}
              onChange={(c) => setValue('resultado', c)}
              placeholder="Selecciona un resultado"
            />
          </Campo>

          {/* Institución */}
          <Campo label="Institución" htmlFor="institucion">
            <Input id="institucion" {...register('institucion')} />
          </Campo>

          {/* Folio */}
          <Campo label="Folio" htmlFor="folio">
            <Input id="folio" {...register('folio')} />
          </Campo>

          {/* Fecha evaluación */}
          <Campo
            label="Fecha de evaluación"
            htmlFor="fechaEvaluacion"
            error={errors.fechaEvaluacion?.message}
          >
            <Input id="fechaEvaluacion" type="date" {...register('fechaEvaluacion')} />
          </Campo>

          {/* Fecha vencimiento */}
          <Campo label="Fecha de vencimiento" htmlFor="fechaVencimiento">
            <Input id="fechaVencimiento" type="date" {...register('fechaVencimiento')} />
          </Campo>

          {/* Observaciones */}
          <Campo label="Observaciones" htmlFor="observaciones" full>
            <textarea
              id="observaciones"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              {...register('observaciones')}
            />
          </Campo>

          {/* Archivo key */}
          <Campo label="Clave de archivo" htmlFor="archivoKey">
            <Input id="archivoKey" {...register('archivoKey')} />
          </Campo>
        </CamposGrid>
      </ExpedienteFormDialog>

      {/* Tabla */}
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
                  <TableCell>
                    <CatalogoTexto grupo="TIPO_CONTROL_CONFIANZA" codigo={registro.tipo} />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="RESULTADO_EXAMEN" codigo={registro.resultado} />
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
                        onClick={() => abrirEdicion(registro)}
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
