'use client';

import { z } from 'zod';
import { seleccionRequerida, numeroOpcional } from '@/lib/validacion';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import {
  CeldaPrincipal,
  Conteo,
} from '@/components/conductores/expediente/tabla-ui';
import { useSeccionExpediente } from '@/components/conductores/expediente/use-seccion-expediente';

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
  tipoUnidad: seleccionRequerida(),
  nivel: z.string().optional(),
  aniosExperiencia: numeroOpcional({ min: 0, max: 60, entero: true }),
  notas: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── tab principal ──────────────────────────────────────────────────────────────

export function AptitudesTab({ conductorId }: { conductorId: string }) {
  const seccion = useSeccionExpediente<AptitudUnidadConductor, FormValues>({
    conductorId,
    queryKey: 'aptitudes-unidad',
    endpoint: 'aptitudes-unidad',
    schema,
    toDefaults: (aptitud) => ({
      tipoUnidad: aptitud?.tipoUnidad ?? '',
      nivel: aptitud?.nivel ?? '',
      aniosExperiencia:
        aptitud?.aniosExperiencia != null
          ? String(aptitud.aniosExperiencia)
          : '',
      notas: aptitud?.notas ?? '',
    }),
    toPayload: (values) => {
      const payload: Record<string, unknown> = {
        tipoUnidad: values.tipoUnidad,
      };
      if (values.nivel) payload.nivel = values.nivel;
      if (values.aniosExperiencia?.trim()) {
        payload.aniosExperiencia = Number(values.aniosExperiencia);
      }
      if (values.notas?.trim()) payload.notas = values.notas.trim();
      return payload;
    },
    mensajes: {
      creado: 'Aptitud agregada',
      actualizado: 'Aptitud actualizada',
      eliminado: 'Aptitud eliminada',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;
  const tipoUnidad = watch('tipoUnidad');
  const nivel = watch('nivel');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Conteo n={data?.length ?? 0} />
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar aptitud
        </Button>
      </div>

      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar aptitud' : 'Nueva aptitud'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo label="Tipo de unidad" required error={errors.tipoUnidad?.message}>
            <CatalogoSelect
              grupo="TIPO_UNIDAD_MANEJO"
              value={tipoUnidad}
              onChange={(c) => setValue('tipoUnidad', c, { shouldValidate: true })}
              placeholder="Selecciona un tipo"
            />
          </Campo>
          <Campo label="Nivel">
            <CatalogoSelect
              grupo="NIVEL_APTITUD"
              value={nivel ?? ''}
              onChange={(c) => setValue('nivel', c, { shouldValidate: true })}
              placeholder="Selecciona un nivel"
            />
          </Campo>
          <Campo
            label="Años de experiencia"
            htmlFor="aniosExperiencia"
            error={errors.aniosExperiencia?.message}
          >
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
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Unidad</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Nivel</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Experiencia</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((aptitud) => (
                <TableRow key={aptitud.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={<CatalogoTexto grupo="TIPO_UNIDAD_MANEJO" codigo={aptitud.tipoUnidad} />}
                      subtitulo={aptitud.notas ?? ''}
                    />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="NIVEL_APTITUD" codigo={aptitud.nivel} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {aptitud.aniosExperiencia != null
                      ? `${aptitud.aniosExperiencia} año(s)`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(aptitud)}
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
                        onConfirm={() => seccion.eliminar(aptitud.id)}
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
