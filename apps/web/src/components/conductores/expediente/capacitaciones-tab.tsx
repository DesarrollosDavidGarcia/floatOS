'use client';

import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';
import {
  CeldaPrincipal,
  Conteo,
  unirSub,
} from '@/components/conductores/expediente/tabla-ui';
import {
  ArchivosExpedienteButton,
  useConteosArchivosExpediente,
} from '@/components/conductores/expediente/archivos-expediente-button';
import { useSeccionExpediente } from '@/components/conductores/expediente/use-seccion-expediente';
import {
  textoRequerido,
  numeroOpcional,
  finNoAntesDeInicio,
} from '@/lib/validacion';
import { isoADate } from '@/lib/fecha';

interface CapacitacionConductor {
  id: string;
  conductorId: string;
  nombre: string;
  instructor?: string | null;
  institucion?: string | null;
  horas?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  aprobado?: boolean | null;
  calificacion?: number | null;
  constanciaKey?: string | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Schema ──────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    nombre: textoRequerido('El nombre del curso es obligatorio'),
    instructor: z.string().trim().optional(),
    institucion: z.string().trim().optional(),
    horas: numeroOpcional({ min: 0, entero: true }),
    calificacion: numeroOpcional({ min: 0, max: 100 }),
    fechaInicio: z.string().optional(),
    fechaFin: z.string().optional(),
    aprobado: z.string().optional(),
    constanciaKey: z.string().trim().optional(),
    notas: z.string().trim().optional(),
  })
  .refine((d) => finNoAntesDeInicio(d.fechaInicio, d.fechaFin), {
    path: ['fechaFin'],
    message: 'No puede ser anterior a la fecha de inicio',
  });

type FormValues = z.infer<typeof schema>;

export function CapacitacionesTab({ conductorId }: { conductorId: string }) {
  const seccion = useSeccionExpediente<CapacitacionConductor, FormValues>({
    conductorId,
    queryKey: 'capacitaciones',
    endpoint: 'capacitaciones',
    schema,
    toDefaults: (cap) => ({
      nombre: cap?.nombre ?? '',
      instructor: cap?.instructor ?? '',
      institucion: cap?.institucion ?? '',
      horas: cap?.horas?.toString() ?? '',
      calificacion: cap?.calificacion?.toString() ?? '',
      fechaInicio: isoADate(cap?.fechaInicio),
      fechaFin: isoADate(cap?.fechaFin),
      aprobado:
        cap?.aprobado === true
          ? 'true'
          : cap?.aprobado === false
            ? 'false'
            : '',
      constanciaKey: cap?.constanciaKey ?? '',
      notas: cap?.notas ?? '',
    }),
    toPayload: (values) => {
      const payload: Record<string, unknown> = { nombre: values.nombre.trim() };
      if (values.instructor?.trim()) payload.instructor = values.instructor.trim();
      if (values.institucion?.trim()) payload.institucion = values.institucion.trim();
      if (values.horas?.trim()) payload.horas = Number(values.horas);
      if (values.fechaInicio) payload.fechaInicio = new Date(values.fechaInicio).toISOString();
      if (values.fechaFin) payload.fechaFin = new Date(values.fechaFin).toISOString();
      if (values.aprobado !== '' && values.aprobado != null)
        payload.aprobado = values.aprobado === 'true';
      if (values.calificacion?.trim()) payload.calificacion = Number(values.calificacion);
      if (values.constanciaKey?.trim()) payload.constanciaKey = values.constanciaKey.trim();
      if (values.notas?.trim()) payload.notas = values.notas.trim();
      return payload;
    },
    mensajes: {
      creado: 'Capacitación agregada',
      actualizado: 'Capacitación actualizada',
      eliminado: 'Capacitación eliminada',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;
  const aprobado = watch('aprobado');

  const { data: conteos } = useConteosArchivosExpediente(conductorId, 'capacitaciones');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Conteo n={data?.length ?? 0} />
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar capacitación
        </Button>
      </div>

      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar capacitación' : 'Nueva capacitación'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo
            label="Nombre"
            htmlFor="cap-nombre"
            full
            required
            error={errors.nombre?.message}
          >
            <Input
              id="cap-nombre"
              placeholder="Nombre del curso"
              {...register('nombre')}
            />
          </Campo>

          <Campo label="Instructor" htmlFor="cap-instructor">
            <Input id="cap-instructor" {...register('instructor')} />
          </Campo>

          <Campo label="Institución" htmlFor="cap-institucion">
            <Input id="cap-institucion" {...register('institucion')} />
          </Campo>

          <Campo label="Horas" htmlFor="cap-horas" error={errors.horas?.message}>
            <Input
              id="cap-horas"
              type="number"
              min={0}
              {...register('horas')}
            />
          </Campo>

          <Campo
            label="Calificación"
            htmlFor="cap-calificacion"
            error={errors.calificacion?.message}
          >
            <Input
              id="cap-calificacion"
              type="number"
              step="0.01"
              min={0}
              {...register('calificacion')}
            />
          </Campo>

          <Campo label="Fecha inicio" htmlFor="cap-fechaInicio">
            <Input
              id="cap-fechaInicio"
              type="date"
              {...register('fechaInicio')}
            />
          </Campo>

          <Campo
            label="Fecha fin"
            htmlFor="cap-fechaFin"
            error={errors.fechaFin?.message}
          >
            <Input
              id="cap-fechaFin"
              type="date"
              {...register('fechaFin')}
            />
          </Campo>

          <Campo label="Aprobado">
            <Select
              value={aprobado ?? ''}
              onValueChange={(c) => setValue('aprobado', c, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sí</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          <Campo label="Clave constancia" htmlFor="cap-constanciaKey">
            <Input id="cap-constanciaKey" {...register('constanciaKey')} />
          </Campo>

          <Campo label="Notas" htmlFor="cap-notas" full>
            <textarea
              id="cap-notas"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              {...register('notas')}
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
            No se pudieron cargar las capacitaciones.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin capacitaciones registradas.
          </p>
        ) : (
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Curso</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Horas</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Calificación</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Aprobado</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cap) => (
                <TableRow key={cap.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={cap.nombre}
                      subtitulo={unirSub(cap.institucion, cap.instructor)}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{cap.horas ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{cap.calificacion ?? '—'}</TableCell>
                  <TableCell>
                    {cap.aprobado === true ? (
                      <Badge variant="default">Sí</Badge>
                    ) : cap.aprobado === false ? (
                      <Badge variant="destructive">No</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ArchivosExpedienteButton
                        conductorId={conductorId}
                        seccion="capacitaciones"
                        registroId={cap.id}
                        titulo={cap.nombre}
                        count={conteos?.[cap.id]}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(cap)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Eliminar capacitación"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => seccion.eliminar(cap.id)}
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
