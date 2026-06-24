'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  textoRequerido,
  seleccionRequerida,
  fechaRequerida,
  numeroOpcional,
} from '@/lib/validacion';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoBadge, CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import {
  CeldaPrincipal,
  Fecha,
  Dinero,
  Conteo,
} from '@/components/conductores/expediente/tabla-ui';
import {
  ArchivosExpedienteButton,
  useConteosArchivosExpediente,
} from '@/components/conductores/expediente/archivos-expediente-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';
import { useSeccionExpediente } from '@/components/conductores/expediente/use-seccion-expediente';
import { isoADate } from '@/lib/fecha';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Incidencia {
  id: string;
  conductorId: string;
  viajeId: string | null;
  tipo: string;
  gravedad: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  lugar: string | null;
  costoEstimado: string | null;
  resuelta: boolean;
  evidenciaKey: string | null;
  registradoPor: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: seleccionRequerida(),
  titulo: textoRequerido('El título es obligatorio'),
  fecha: fechaRequerida('La fecha es obligatoria'),
  gravedad: z.string().optional(),
  descripcion: z.string().trim().optional(),
  lugar: z.string().trim().optional(),
  costoEstimado: numeroOpcional({ min: 0 }),
  resuelta: z.string().optional(),
  evidenciaKey: z.string().trim().optional(),
  registradoPor: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Tab principal ────────────────────────────────────────────────────────────

export function IncidenciasTab({ conductorId }: { conductorId: string }) {
  const [eliminarTarget, setEliminarTarget] = useState<Incidencia | null>(null);

  const seccion = useSeccionExpediente<Incidencia, FormValues>({
    conductorId,
    queryKey: 'incidencias',
    endpoint: 'incidencias',
    schema,
    toDefaults: (inc) => ({
      tipo: inc?.tipo ?? '',
      titulo: inc?.titulo ?? '',
      fecha: isoADate(inc?.fecha),
      gravedad: inc?.gravedad ?? '',
      descripcion: inc?.descripcion ?? '',
      lugar: inc?.lugar ?? '',
      costoEstimado: inc?.costoEstimado ?? '',
      resuelta: inc ? String(inc.resuelta) : 'false',
      evidenciaKey: inc?.evidenciaKey ?? '',
      registradoPor: inc?.registradoPor ?? '',
    }),
    toPayload: (values) => {
      const payload: Record<string, unknown> = {
        tipo: values.tipo,
        titulo: values.titulo.trim(),
        fecha: new Date(values.fecha).toISOString(),
        resuelta: values.resuelta === 'true',
      };
      if (values.gravedad) payload.gravedad = values.gravedad;
      if (values.descripcion?.trim()) payload.descripcion = values.descripcion.trim();
      if (values.lugar?.trim()) payload.lugar = values.lugar.trim();
      if (values.costoEstimado?.trim())
        payload.costoEstimado = Number(values.costoEstimado);
      if (values.evidenciaKey?.trim()) payload.evidenciaKey = values.evidenciaKey.trim();
      if (values.registradoPor?.trim())
        payload.registradoPor = values.registradoPor.trim();
      return payload;
    },
    mensajes: {
      creado: 'Incidencia registrada',
      actualizado: 'Incidencia actualizada',
      eliminado: 'Incidencia eliminada',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;
  const tipo = watch('tipo');
  const gravedad = watch('gravedad');
  const resuelta = watch('resuelta');

  const { data: conteos } = useConteosArchivosExpediente(conductorId, 'incidencias');

  return (
    <div className="space-y-4">
      {/* Contador + Botón Agregar */}
      <div className="flex items-center justify-between">
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar incidencia
        </Button>
      </div>

      {/* Modal crear / editar */}
      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar incidencia' : 'Nueva incidencia'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
        size="lg"
      >
        <CamposGrid cols={2}>
          {/* Tipo */}
          <Campo
            label="Tipo"
            required
            error={errors.tipo?.message}
          >
            <CatalogoSelect
              grupo="TIPO_INCIDENCIA"
              value={tipo}
              onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
              placeholder="Selecciona…"
            />
          </Campo>

          {/* Gravedad */}
          <Campo label="Gravedad">
            <CatalogoSelect
              grupo="GRAVEDAD_INCIDENCIA"
              value={gravedad ?? ''}
              onChange={(c) => setValue('gravedad', c, { shouldValidate: true })}
              placeholder="Selecciona…"
            />
          </Campo>

          {/* Título */}
          <Campo
            label="Título"
            htmlFor="titulo"
            required
            error={errors.titulo?.message}
            full
          >
            <Input id="titulo" {...register('titulo')} />
          </Campo>

          {/* Fecha */}
          <Campo
            label="Fecha"
            htmlFor="fecha"
            required
            error={errors.fecha?.message}
          >
            <Input id="fecha" type="date" {...register('fecha')} />
          </Campo>

          {/* Lugar */}
          <Campo label="Lugar" htmlFor="lugar">
            <Input id="lugar" {...register('lugar')} />
          </Campo>

          {/* Costo estimado */}
          <Campo label="Costo estimado" htmlFor="costoEstimado" error={errors.costoEstimado?.message}>
            <Input
              id="costoEstimado"
              type="number"
              min="0"
              step="0.01"
              {...register('costoEstimado')}
            />
          </Campo>

          {/* Resuelta */}
          <Campo label="Resuelta">
            <Select
              value={resuelta ?? 'false'}
              onValueChange={(v) => setValue('resuelta', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sí</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          {/* Registrado por */}
          <Campo label="Registrado por" htmlFor="registradoPor">
            <Input id="registradoPor" {...register('registradoPor')} />
          </Campo>

          {/* Evidencia key */}
          <Campo label="Clave de evidencia" htmlFor="evidenciaKey">
            <Input id="evidenciaKey" {...register('evidenciaKey')} />
          </Campo>

          {/* Descripción */}
          <Campo label="Descripción" htmlFor="descripcion" full>
            <textarea
              id="descripcion"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              {...register('descripcion')}
            />
          </Campo>
        </CamposGrid>
      </ExpedienteFormDialog>

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-destructive">
          No se pudieron cargar las incidencias.
        </p>
      ) : !data || data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin incidencias registradas.
        </p>
      ) : (
        <div className="overflow-auto">
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Incidencia</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Gravedad</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Fecha</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Costo</TableHead>
                <TableHead className="hidden lg:table-cell text-xs uppercase text-muted-foreground">Resuelta</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={inc.titulo}
                      subtitulo={
                        <span>
                          <CatalogoTexto grupo="TIPO_INCIDENCIA" codigo={inc.tipo} />
                          {inc.lugar ? ` · ${inc.lugar}` : ''}
                        </span>
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <CatalogoBadge grupo="GRAVEDAD_INCIDENCIA" codigo={inc.gravedad} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Fecha iso={inc.fecha} /></TableCell>
                  <TableCell className="hidden md:table-cell"><Dinero value={inc.costoEstimado} /></TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={inc.resuelta ? 'outline' : 'secondary'}>
                      {inc.resuelta ? 'Sí' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ArchivosExpedienteButton
                        conductorId={conductorId}
                        seccion="incidencias"
                        registroId={inc.id}
                        titulo={inc.titulo}
                        count={conteos?.[inc.id]}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(inc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEliminarTarget(inc)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo de confirmación de borrado */}
      <Dialog
        open={Boolean(eliminarTarget)}
        onOpenChange={(open) => { if (!open) setEliminarTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar incidencia</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar{' '}
            <span className="font-medium">{eliminarTarget?.titulo}</span>? Esta
            acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEliminarTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={seccion.eliminando}
              onClick={() => {
                if (eliminarTarget)
                  seccion
                    .eliminar(eliminarTarget.id)
                    .then(() => setEliminarTarget(null))
                    .catch(() => {});
              }}
            >
              {seccion.eliminando ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
