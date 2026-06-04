'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  seleccionRequerida,
  fechaRequerida,
  numeroOpcional,
  finNoAntesDeInicio,
} from '@/lib/validacion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
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
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import {
  CeldaPrincipal,
  RangoFechas,
  Conteo,
  unirSub,
} from '@/components/conductores/expediente/tabla-ui';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface AusenciaConductor {
  id: string;
  conductorId: string;
  tipo: string;
  fechaInicio: string;
  fechaFin?: string | null;
  dias?: number | null;
  motivo?: string | null;
  folioIncapacidad?: string | null;
  autorizadoPor?: string | null;
  documentoKey?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    tipo: seleccionRequerida(),
    fechaInicio: fechaRequerida('La fecha de inicio es obligatoria'),
    fechaFin: z.string().optional(),
    dias: numeroOpcional({ min: 0, entero: true }),
    motivo: z.string().trim().optional(),
    folioIncapacidad: z.string().trim().optional(),
    autorizadoPor: z.string().trim().optional(),
    documentoKey: z.string().trim().optional(),
  })
  .refine(
    (d) => finNoAntesDeInicio(d.fechaInicio, d.fechaFin),
    { path: ['fechaFin'], message: 'No puede ser anterior a la fecha de inicio' },
  );

type FormValues = z.infer<typeof schema>;

// ── Tab ────────────────────────────────────────────────────────────────────────

export function AusenciasTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<AusenciaConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-ausencias', conductorId],
    queryFn: async () => {
      const { data } = await api.get<AusenciaConductor[]>(
        `/conductores/${conductorId}/ausencias`,
      );
      return data;
    },
    enabled: Boolean(conductorId),
  });

  const eliminar = useMutation({
    mutationFn: async (ausenciaId: string) => {
      await api.delete(`/conductores/${conductorId}/ausencias/${ausenciaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-ausencias', conductorId],
      });
      toast.success('Ausencia eliminada');
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
      fechaInicio: '',
      fechaFin: '',
      dias: '',
      motivo: '',
      folioIncapacidad: '',
      autorizadoPor: '',
      documentoKey: '',
    },
  });

  useEffect(() => {
    reset({
      tipo: editando?.tipo ?? '',
      fechaInicio: isoADate(editando?.fechaInicio),
      fechaFin: isoADate(editando?.fechaFin),
      dias: editando?.dias != null ? String(editando.dias) : '',
      motivo: editando?.motivo ?? '',
      folioIncapacidad: editando?.folioIncapacidad ?? '',
      autorizadoPor: editando?.autorizadoPor ?? '',
      documentoKey: editando?.documentoKey ?? '',
    });
  }, [editando, mostrarForm, reset]);

  const tipo = watch('tipo');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        fechaInicio: new Date(values.fechaInicio).toISOString(),
      };
      if (values.fechaFin) {
        payload.fechaFin = new Date(values.fechaFin).toISOString();
      }
      if (values.dias?.trim()) {
        payload.dias = Number(values.dias);
      }
      if (values.motivo?.trim()) payload.motivo = values.motivo.trim();
      if (values.folioIncapacidad?.trim()) payload.folioIncapacidad = values.folioIncapacidad.trim();
      if (values.autorizadoPor?.trim()) payload.autorizadoPor = values.autorizadoPor.trim();
      if (values.documentoKey?.trim()) payload.documentoKey = values.documentoKey.trim();

      if (esEdicion && editando) {
        await api.patch(
          `/conductores/${conductorId}/ausencias/${editando.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/ausencias`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-ausencias', conductorId],
      });
      toast.success(esEdicion ? 'Ausencia actualizada' : 'Ausencia registrada');
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div className="space-y-4">
      {/* Contador + Botón Agregar */}
      <div className="flex items-center justify-between">
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar ausencia
        </Button>
      </div>

      {/* Modal compacto (crear y editar) */}
      <ExpedienteFormDialog
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        title={esEdicion ? 'Editar ausencia' : 'Nueva ausencia'}
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        saving={mutation.isPending}
        submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo label="Tipo" required error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_AUSENCIA"
              value={tipo}
              onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
              placeholder="Selecciona…"
            />
          </Campo>
          <Campo label="Días" htmlFor="aus-dias" error={errors.dias?.message}>
            <Input id="aus-dias" type="number" min={0} {...register('dias')} />
          </Campo>
          <Campo label="Fecha de inicio" htmlFor="aus-fechaInicio" required error={errors.fechaInicio?.message}>
            <Input id="aus-fechaInicio" type="date" {...register('fechaInicio')} />
          </Campo>
          <Campo label="Fecha de fin" htmlFor="aus-fechaFin" error={errors.fechaFin?.message}>
            <Input id="aus-fechaFin" type="date" {...register('fechaFin')} />
          </Campo>
          <Campo label="Folio de incapacidad" htmlFor="aus-folioIncapacidad">
            <Input id="aus-folioIncapacidad" {...register('folioIncapacidad')} />
          </Campo>
          <Campo label="Autorizado por" htmlFor="aus-autorizadoPor">
            <Input id="aus-autorizadoPor" {...register('autorizadoPor')} />
          </Campo>
          <Campo label="Motivo" htmlFor="aus-motivo" full>
            <textarea
              id="aus-motivo"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              {...register('motivo')}
            />
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
            No se pudieron cargar las ausencias.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin ausencias registradas.
          </p>
        ) : (
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Periodo</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Días</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ausencia) => (
                <TableRow key={ausencia.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={<CatalogoTexto grupo="TIPO_AUSENCIA" codigo={ausencia.tipo} />}
                      subtitulo={unirSub(
                        ausencia.motivo,
                        ausencia.folioIncapacidad ? `Folio ${ausencia.folioIncapacidad}` : '',
                        ausencia.autorizadoPor ? `Aut: ${ausencia.autorizadoPor}` : '',
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <RangoFechas inicio={ausencia.fechaInicio} fin={ausencia.fechaFin} />
                  </TableCell>
                  <TableCell>{ausencia.dias ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(ausencia);
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
                        title="Eliminar ausencia"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(ausencia.id)}
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
