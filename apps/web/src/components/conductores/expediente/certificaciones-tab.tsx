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
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

// ── tipos ──────────────────────────────────────────────────────────────────────

interface CertificacionConductor {
  id: string;
  conductorId: string;
  tipo: string;
  nombre: string;
  emisor: string | null;
  folio: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  archivoKey: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── badge de vencimiento ───────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

function vencimientoBadge(fechaVencimiento: string | null): {
  label: string;
  variant: BadgeVariant;
} | null {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  venc.setHours(0, 0, 0, 0);
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);

  if (dias < 0) {
    return {
      label: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
      variant: 'destructive',
    };
  }
  if (dias === 0) return { label: 'Vence hoy', variant: 'destructive' };
  if (dias <= 30) {
    return {
      label: `Vence en ${dias} día${dias === 1 ? '' : 's'}`,
      variant: 'warning',
    };
  }
  return { label: 'Vigente', variant: 'success' };
}

// ── helpers ────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ── schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.string().min(1, 'Requerido'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  emisor: z.string().trim().optional(),
  folio: z.string().trim().optional(),
  fechaEmision: z.string().optional(),
  fechaVencimiento: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── tab principal ──────────────────────────────────────────────────────────────

export function CertificacionesTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<CertificacionConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-certificaciones', conductorId],
    queryFn: async () => {
      const { data } = await api.get<CertificacionConductor[]>(
        `/conductores/${conductorId}/certificaciones`,
      );
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (certId: string) => {
      await api.delete(`/conductores/${conductorId}/certificaciones/${certId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-certificaciones', conductorId],
      });
      toast.success('Certificación eliminada');
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
    defaultValues: {
      tipo: '',
      nombre: '',
      emisor: '',
      folio: '',
      fechaEmision: '',
      fechaVencimiento: '',
    },
  });

  useEffect(() => {
    reset({
      tipo: editando?.tipo ?? '',
      nombre: editando?.nombre ?? '',
      emisor: editando?.emisor ?? '',
      folio: editando?.folio ?? '',
      fechaEmision: isoADate(editando?.fechaEmision),
      fechaVencimiento: isoADate(editando?.fechaVencimiento),
    });
  }, [editando, mostrarForm, reset]);

  const tipo = watch('tipo');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        nombre: values.nombre,
      };
      if (values.emisor?.trim()) payload.emisor = values.emisor.trim();
      if (values.folio?.trim()) payload.folio = values.folio.trim();
      if (values.fechaEmision) {
        payload.fechaEmision = new Date(values.fechaEmision).toISOString();
      }
      if (values.fechaVencimiento) {
        payload.fechaVencimiento = new Date(values.fechaVencimiento).toISOString();
      }

      if (esEdicion && editando) {
        await api.patch(
          `/conductores/${conductorId}/certificaciones/${editando.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/certificaciones`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-certificaciones', conductorId],
      });
      toast.success(esEdicion ? 'Certificación actualizada' : 'Certificación agregada');
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div className="space-y-4">
      {/* Botón Agregar siempre visible arriba a la derecha */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar certificación
        </Button>
      </div>

      {/* Modal compacto (crear y editar) */}
      <ExpedienteFormDialog
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        title={esEdicion ? 'Editar certificación' : 'Nueva certificación'}
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        saving={mutation.isPending}
        submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo label="Tipo" error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_CERTIFICACION"
              value={tipo}
              onChange={(c) => setValue('tipo', c)}
              placeholder="Selecciona…"
            />
          </Campo>
          <Campo label="Nombre" htmlFor="cert-nombre" error={errors.nombre?.message}>
            <Input id="cert-nombre" {...register('nombre')} />
          </Campo>
          <Campo label="Emisor" htmlFor="cert-emisor">
            <Input id="cert-emisor" {...register('emisor')} />
          </Campo>
          <Campo label="Folio" htmlFor="cert-folio">
            <Input id="cert-folio" {...register('folio')} />
          </Campo>
          <Campo label="Fecha de emisión" htmlFor="cert-fechaEmision">
            <Input id="cert-fechaEmision" type="date" {...register('fechaEmision')} />
          </Campo>
          <Campo label="Fecha de vencimiento" htmlFor="cert-fechaVencimiento">
            <Input id="cert-fechaVencimiento" type="date" {...register('fechaVencimiento')} />
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
            No se pudieron cargar las certificaciones.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin certificaciones registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Emisor</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cert) => {
                const badge = vencimientoBadge(cert.fechaVencimiento);
                return (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <CatalogoTexto grupo="TIPO_CERTIFICACION" codigo={cert.tipo} />
                    </TableCell>
                    <TableCell>{cert.nombre}</TableCell>
                    <TableCell>{cert.emisor ?? '—'}</TableCell>
                    <TableCell>{cert.folio ?? '—'}</TableCell>
                    <TableCell>
                      {cert.fechaVencimiento
                        ? format(new Date(cert.fechaVencimiento), 'dd MMM yyyy', {
                            locale: es,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {badge ? (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditando(cert);
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
                          title="Eliminar certificación"
                          description="Esta acción no se puede deshacer."
                          confirmLabel="Eliminar"
                          onConfirm={() => eliminar.mutateAsync(cert.id)}
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
