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

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    tipo: seleccionRequerida(),
    resultado: z.string().optional(),
    fechaExamen: fechaRequerida('La fecha del examen es obligatoria'),
    fechaVencimiento: z.string().optional(),
    institucion: z.string().trim().optional(),
    medico: z.string().trim().optional(),
    observaciones: z.string().trim().optional(),
    archivoKey: z.string().trim().optional(),
  })
  .refine((d) => finNoAntesDeInicio(d.fechaExamen, d.fechaVencimiento), {
    path: ['fechaVencimiento'],
    message: 'No puede ser anterior a la fecha del examen',
  });

type FormValues = z.infer<typeof schema>;

// ── Tab ────────────────────────────────────────────────────────────────────────

export function MedicoTab({ conductorId }: { conductorId: string }) {
  const seccion = useSeccionExpediente<ExamenMedico, FormValues>({
    conductorId,
    queryKey: 'examenes-medicos',
    endpoint: 'examenes-medicos',
    schema,
    enabled: Boolean(conductorId),
    toDefaults: (examen) => ({
      tipo: examen?.tipo ?? '',
      resultado: examen?.resultado ?? '',
      fechaExamen: isoADate(examen?.fechaExamen),
      fechaVencimiento: isoADate(examen?.fechaVencimiento),
      institucion: examen?.institucion ?? '',
      medico: examen?.medico ?? '',
      observaciones: examen?.observaciones ?? '',
      archivoKey: examen?.archivoKey ?? '',
    }),
    toPayload: (values) => {
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
      return payload;
    },
    mensajes: {
      creado: 'Examen agregado',
      actualizado: 'Examen actualizado',
      eliminado: 'Examen eliminado',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;

  const { data: conteos } = useConteosArchivosExpediente(conductorId, 'examenes-medicos');

  return (
    <div className="space-y-4">
      <SeccionHeader>
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar examen
        </Button>
      </SeccionHeader>

      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar examen médico' : 'Nuevo examen médico'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo label="Tipo" required error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_EXAMEN_MEDICO"
              value={watch('tipo')}
              onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
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
            required
            error={errors.fechaExamen?.message}
          >
            <Input id="fechaExamen" type="date" {...register('fechaExamen')} />
          </Campo>

          <Campo
            label="Fecha de vencimiento"
            htmlFor="fechaVencimiento"
            error={errors.fechaVencimiento?.message}
          >
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
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Examen</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Resultado</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Fecha</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Vigencia</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((examen) => (
                <TableRow key={examen.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={<CatalogoTexto grupo="TIPO_EXAMEN_MEDICO" codigo={examen.tipo} />}
                      subtitulo={unirSub(examen.institucion, examen.medico)}
                    />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="RESULTADO_EXAMEN" codigo={examen.resultado} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Fecha iso={examen.fechaExamen} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Vigencia iso={examen.fechaVencimiento} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ArchivosExpedienteButton
                        conductorId={conductorId}
                        seccion="examenes-medicos"
                        registroId={examen.id}
                        titulo={examen.institucion ?? 'Examen médico'}
                        count={conteos?.[examen.id]}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(examen)}
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
                        onConfirm={() => seccion.eliminar(examen.id)}
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
