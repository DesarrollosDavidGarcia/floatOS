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
import { Label } from '@/components/ui/label';
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

const schema = z.object({
  tipo: z.string().min(1, 'Requerido'),
  fechaInicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fechaFin: z.string().optional(),
  dias: z.string().optional(),
  motivo: z.string().trim().optional(),
  folioIncapacidad: z.string().trim().optional(),
  autorizadoPor: z.string().trim().optional(),
  documentoKey: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Form ───────────────────────────────────────────────────────────────────────

function AusenciaForm({
  conductorId,
  ausencia,
  onDone,
}: {
  conductorId: string;
  ausencia?: AusenciaConductor;
  onDone: () => void;
}) {
  const esEdicion = Boolean(ausencia);
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
      tipo: ausencia?.tipo ?? '',
      fechaInicio: isoADate(ausencia?.fechaInicio),
      fechaFin: isoADate(ausencia?.fechaFin),
      dias: ausencia?.dias != null ? String(ausencia.dias) : '',
      motivo: ausencia?.motivo ?? '',
      folioIncapacidad: ausencia?.folioIncapacidad ?? '',
      autorizadoPor: ausencia?.autorizadoPor ?? '',
      documentoKey: ausencia?.documentoKey ?? '',
    },
  });

  useEffect(() => {
    reset({
      tipo: ausencia?.tipo ?? '',
      fechaInicio: isoADate(ausencia?.fechaInicio),
      fechaFin: isoADate(ausencia?.fechaFin),
      dias: ausencia?.dias != null ? String(ausencia.dias) : '',
      motivo: ausencia?.motivo ?? '',
      folioIncapacidad: ausencia?.folioIncapacidad ?? '',
      autorizadoPor: ausencia?.autorizadoPor ?? '',
      documentoKey: ausencia?.documentoKey ?? '',
    });
  }, [ausencia, reset]);

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

      if (esEdicion && ausencia) {
        await api.patch(
          `/conductores/${conductorId}/ausencias/${ausencia.id}`,
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
        {esEdicion ? 'Editar ausencia' : 'Nueva ausencia'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <CatalogoSelect
            grupo="TIPO_AUSENCIA"
            value={tipo}
            onChange={(c) => setValue('tipo', c)}
            placeholder="Selecciona…"
          />
          {errors.tipo && (
            <p className="text-sm text-destructive">{errors.tipo.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dias">Días</Label>
          <Input id="dias" type="number" min={1} {...register('dias')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fechaInicio">Fecha de inicio</Label>
          <Input id="fechaInicio" type="date" {...register('fechaInicio')} />
          {errors.fechaInicio && (
            <p className="text-sm text-destructive">{errors.fechaInicio.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fechaFin">Fecha de fin</Label>
          <Input id="fechaFin" type="date" {...register('fechaFin')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="folioIncapacidad">Folio de incapacidad</Label>
          <Input id="folioIncapacidad" {...register('folioIncapacidad')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="autorizadoPor">Autorizado por</Label>
          <Input id="autorizadoPor" {...register('autorizadoPor')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="motivo">Motivo</Label>
          <textarea
            id="motivo"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('motivo')}
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

  return (
    <div className="space-y-4">
      {!mostrarForm && !editando && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setMostrarForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Agregar ausencia
          </Button>
        </div>
      )}

      {(mostrarForm || editando) && (
        <AusenciaForm
          conductorId={conductorId}
          ausencia={editando ?? undefined}
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
            No se pudieron cargar las ausencias.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin ausencias registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Folio incapacidad</TableHead>
                <TableHead>Autorizado por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((ausencia) => (
                <TableRow key={ausencia.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      <CatalogoTexto grupo="TIPO_AUSENCIA" codigo={ausencia.tipo} />
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(ausencia.fechaInicio), 'dd MMM yyyy', { locale: es })}
                    {ausencia.fechaFin
                      ? ` – ${format(new Date(ausencia.fechaFin), 'dd MMM yyyy', { locale: es })}`
                      : ''}
                  </TableCell>
                  <TableCell>
                    {ausencia.dias != null ? ausencia.dias : '—'}
                  </TableCell>
                  <TableCell>{ausencia.folioIncapacidad ?? '—'}</TableCell>
                  <TableCell>{ausencia.autorizadoPor ?? '—'}</TableCell>
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
