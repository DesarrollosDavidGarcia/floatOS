'use client';

import { z } from 'zod';
import {
  seleccionRequerida,
  fechaRequerida,
  numeroOpcional,
  finNoAntesDeInicio,
} from '@/lib/validacion';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { useSeccionExpediente } from '@/components/conductores/expediente/use-seccion-expediente';
import { isoADate } from '@/lib/fecha';

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
  const seccion = useSeccionExpediente<AusenciaConductor, FormValues>({
    conductorId,
    queryKey: 'ausencias',
    endpoint: 'ausencias',
    schema,
    enabled: Boolean(conductorId),
    toDefaults: (ausencia) => ({
      tipo: ausencia?.tipo ?? '',
      fechaInicio: isoADate(ausencia?.fechaInicio),
      fechaFin: isoADate(ausencia?.fechaFin),
      dias: ausencia?.dias != null ? String(ausencia.dias) : '',
      motivo: ausencia?.motivo ?? '',
      folioIncapacidad: ausencia?.folioIncapacidad ?? '',
      autorizadoPor: ausencia?.autorizadoPor ?? '',
      documentoKey: ausencia?.documentoKey ?? '',
    }),
    toPayload: (values) => {
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
      return payload;
    },
    mensajes: {
      creado: 'Ausencia registrada',
      actualizado: 'Ausencia actualizada',
      eliminado: 'Ausencia eliminada',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;
  const tipo = watch('tipo');

  return (
    <div className="space-y-4">
      {/* Contador + Botón Agregar */}
      <div className="flex items-center justify-between">
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar ausencia
        </Button>
      </div>

      {/* Modal compacto (crear y editar) */}
      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar ausencia' : 'Nueva ausencia'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
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
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Días</TableHead>
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
                  <TableCell className="hidden md:table-cell">{ausencia.dias ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(ausencia)}
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
                        onConfirm={() => seccion.eliminar(ausencia.id)}
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
