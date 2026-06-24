'use client';

import { z } from 'zod';
import { textoRequerido, seleccionRequerida, finNoAntesDeInicio } from '@/lib/validacion';
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
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';
import {
  CeldaPrincipal,
  Vigencia,
  Conteo,
} from '@/components/conductores/expediente/tabla-ui';
import {
  ArchivosExpedienteButton,
  useConteosArchivosExpediente,
} from '@/components/conductores/expediente/archivos-expediente-button';
import { useSeccionExpediente } from '@/components/conductores/expediente/use-seccion-expediente';
import { isoADate } from '@/lib/fecha';

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

// ── schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    tipo: seleccionRequerida(),
    nombre: textoRequerido('El nombre es obligatorio'),
    emisor: z.string().trim().optional(),
    folio: z.string().trim().optional(),
    archivoKey: z.string().trim().optional(),
    fechaEmision: z.string().optional(),
    fechaVencimiento: z.string().optional(),
  })
  .refine((d) => finNoAntesDeInicio(d.fechaEmision, d.fechaVencimiento), {
    path: ['fechaVencimiento'],
    message: 'No puede ser anterior a la fecha de emisión',
  });

type FormValues = z.infer<typeof schema>;

// ── tab principal ──────────────────────────────────────────────────────────────

export function CertificacionesTab({ conductorId }: { conductorId: string }) {
  const seccion = useSeccionExpediente<CertificacionConductor, FormValues>({
    conductorId,
    queryKey: 'certificaciones',
    endpoint: 'certificaciones',
    schema,
    toDefaults: (cert) => ({
      tipo: cert?.tipo ?? '',
      nombre: cert?.nombre ?? '',
      emisor: cert?.emisor ?? '',
      folio: cert?.folio ?? '',
      archivoKey: cert?.archivoKey ?? '',
      fechaEmision: isoADate(cert?.fechaEmision),
      fechaVencimiento: isoADate(cert?.fechaVencimiento),
    }),
    toPayload: (values) => {
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
      return payload;
    },
    mensajes: {
      creado: 'Certificación agregada',
      actualizado: 'Certificación actualizada',
      eliminado: 'Certificación eliminada',
    },
  });

  const { items: data, isLoading, isError } = seccion;
  const { register, setValue, watch, formState: { errors } } = seccion.form;
  const tipo = watch('tipo');

  const { data: conteos } = useConteosArchivosExpediente(conductorId, 'certificaciones');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {data && <Conteo n={data.length} />}
        <Button size="sm" onClick={seccion.abrirCrear}>
          <Plus /> Agregar certificación
        </Button>
      </div>

      {/* Modal compacto (crear y editar) */}
      <ExpedienteFormDialog
        open={seccion.abierto}
        onOpenChange={(o) => { if (!o) seccion.cerrarForm(); }}
        title={seccion.esEdicion ? 'Editar certificación' : 'Nueva certificación'}
        onSubmit={seccion.onSubmit}
        saving={seccion.guardando}
        submitLabel={seccion.esEdicion ? 'Guardar' : 'Agregar'}
        size="md"
      >
        <CamposGrid cols={2}>
          <Campo label="Tipo" required error={errors.tipo?.message}>
            <CatalogoSelect
              grupo="TIPO_CERTIFICACION"
              value={tipo}
              onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
              placeholder="Selecciona…"
            />
          </Campo>
          <Campo label="Nombre" htmlFor="cert-nombre" required error={errors.nombre?.message}>
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
          <Campo
            label="Fecha de vencimiento"
            htmlFor="cert-fechaVencimiento"
            error={errors.fechaVencimiento?.message}
          >
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
          <Table className="[&_td]:py-1.5 [&_th]:h-9">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase text-muted-foreground">Certificación</TableHead>
                <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">Folio</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground">Vigencia</TableHead>
                <TableHead className="text-right text-xs uppercase text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={cert.nombre}
                      subtitulo={
                        <span>
                          <CatalogoTexto grupo="TIPO_CERTIFICACION" codigo={cert.tipo} />
                          {cert.emisor ? ` · ${cert.emisor}` : ''}
                        </span>
                      }
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{cert.folio ?? '—'}</TableCell>
                  <TableCell>
                    <Vigencia iso={cert.fechaVencimiento} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ArchivosExpedienteButton
                        conductorId={conductorId}
                        seccion="certificaciones"
                        registroId={cert.id}
                        titulo={cert.nombre}
                        count={conteos?.[cert.id]}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => seccion.abrirEditar(cert)}
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
                        onConfirm={() => seccion.eliminar(cert.id)}
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
