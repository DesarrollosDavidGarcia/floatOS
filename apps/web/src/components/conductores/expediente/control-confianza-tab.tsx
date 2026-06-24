'use client';

import { z } from 'zod';
import {
  seleccionRequerida,
  fechaRequerida,
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
import { CatalogoTexto, CatalogoBadge } from '@/components/catalogos/catalogo-badge';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';
import {
  CeldaPrincipal,
  unirSub,
  Fecha,
  Vigencia,
  Conteo,
} from '@/components/conductores/expediente/tabla-ui';
import {
  ArchivosExpedienteButton,
  useConteosArchivosExpediente,
} from '@/components/conductores/expediente/archivos-expediente-button';
import { useSeccionExpediente } from '@/components/conductores/expediente/use-seccion-expediente';
import { isoADate } from '@/lib/fecha';

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

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    tipo: seleccionRequerida(),
    resultado: z.string().optional(),
    institucion: z.string().trim().optional(),
    folio: z.string().trim().optional(),
    fechaEvaluacion: fechaRequerida('La fecha de evaluación es obligatoria'),
    fechaVencimiento: z.string().optional(),
    observaciones: z.string().trim().optional(),
    archivoKey: z.string().trim().optional(),
  })
  .refine((d) => finNoAntesDeInicio(d.fechaEvaluacion, d.fechaVencimiento), {
    path: ['fechaVencimiento'],
    message: 'No puede ser anterior a la fecha de evaluación',
  });

type FormValues = z.infer<typeof schema>;

// ── Tab ────────────────────────────────────────────────────────────────────────

export function ControlConfianzaTab({ conductorId }: { conductorId: string }) {
  const seccion = useSeccionExpediente<ControlConfianza, FormValues>({
    conductorId,
    queryKey: 'control-confianza',
    endpoint: 'control-confianza',
    schema,
    enabled: Boolean(conductorId),
    toDefaults: (registro) => ({
      tipo: registro?.tipo ?? '',
      resultado: registro?.resultado ?? '',
      institucion: registro?.institucion ?? '',
      folio: registro?.folio ?? '',
      fechaEvaluacion: isoADate(registro?.fechaEvaluacion),
      fechaVencimiento: isoADate(registro?.fechaVencimiento),
      observaciones: registro?.observaciones ?? '',
      archivoKey: registro?.archivoKey ?? '',
    }),
    toPayload: (values) => {
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
      return payload;
    },
    mensajes: {
      creado: 'Registro agregado',
      actualizado: 'Registro actualizado',
      eliminado: 'Registro eliminado',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;
  const tipo = watch('tipo');
  const resultado = watch('resultado');

  const { data: conteos } = useConteosArchivosExpediente(conductorId, 'control-confianza');

  return (
    <div className="space-y-4">
      {/* Botón Agregar siempre visible arriba a la derecha */}
      <div className="flex items-center justify-end gap-3">
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar registro
        </Button>
      </div>

      {/* Modal crear / editar */}
      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar control de confianza' : 'Nuevo control de confianza'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          {/* Tipo */}
          <Campo label="Tipo" required error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_CONTROL_CONFIANZA"
              value={tipo}
              onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
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
            required
            error={errors.fechaEvaluacion?.message}
          >
            <Input id="fechaEvaluacion" type="date" {...register('fechaEvaluacion')} />
          </Campo>

          {/* Fecha vencimiento */}
          <Campo
            label="Fecha de vencimiento"
            htmlFor="fechaVencimiento"
            error={errors.fechaVencimiento?.message}
          >
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
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Resultado</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Fecha</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Vigencia</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={<CatalogoTexto grupo="TIPO_CONTROL_CONFIANZA" codigo={registro.tipo} />}
                      subtitulo={unirSub(registro.institucion, registro.folio)}
                    />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="RESULTADO_EXAMEN" codigo={registro.resultado} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Fecha iso={registro.fechaEvaluacion} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Vigencia iso={registro.fechaVencimiento} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ArchivosExpedienteButton
                        conductorId={conductorId}
                        seccion="control-confianza"
                        registroId={registro.id}
                        titulo={registro.institucion ?? 'Control de confianza'}
                        count={conteos?.[registro.id]}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(registro)}
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
                        onConfirm={() => seccion.eliminar(registro.id)}
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
