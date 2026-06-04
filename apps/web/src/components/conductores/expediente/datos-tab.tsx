'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, X, Check } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import { CamposGrid, Campo } from '@/components/conductores/expediente/form-ui';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ConductorDetalle {
  id: string;
  nombre: string;
  apellidos: string | null;
  usuario: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  curp: string | null;
  rfc: string | null;
  nss: string | null;
  fechaNacimiento: string | null;
  tipoSangre: string | null;
  direccion: string | null;
  numeroEmpleado: string | null;
  puesto: string | null;
  fechaIngreso: string | null;
  categoriaLicencia: string | null;
  emergenciaNombre: string | null;
  emergenciaTelefono: string | null;
  emergenciaRelacion: string | null;
}

interface DatosFormValues {
  curp: string;
  rfc: string;
  nss: string;
  fechaNacimiento: string;
  tipoSangre: string;
  direccion: string;
  numeroEmpleado: string;
  puesto: string;
  fechaIngreso: string;
  categoriaLicencia: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  emergenciaRelacion: string;
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function displayDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Fila de detalle (modo vista) ───────────────────────────────────────────────

function DetalleItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

// ── Sección de tarjeta ─────────────────────────────────────────────────────────

function Seccion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function DatosTab({ conductorId }: { conductorId: string }) {
  const [editando, setEditando] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor', conductorId],
    queryFn: async () => {
      const { data } = await api.get<ConductorDetalle>(`/conductores/${conductorId}`);
      return data;
    },
    enabled: Boolean(conductorId),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DatosFormValues>({
    defaultValues: {
      curp: '',
      rfc: '',
      nss: '',
      fechaNacimiento: '',
      tipoSangre: '',
      direccion: '',
      numeroEmpleado: '',
      puesto: '',
      fechaIngreso: '',
      categoriaLicencia: '',
      emergenciaNombre: '',
      emergenciaTelefono: '',
      emergenciaRelacion: '',
    },
  });

  function iniciarEdicion(conductor: ConductorDetalle) {
    reset({
      curp: conductor.curp ?? '',
      rfc: conductor.rfc ?? '',
      nss: conductor.nss ?? '',
      fechaNacimiento: isoADate(conductor.fechaNacimiento),
      tipoSangre: conductor.tipoSangre ?? '',
      direccion: conductor.direccion ?? '',
      numeroEmpleado: conductor.numeroEmpleado ?? '',
      puesto: conductor.puesto ?? '',
      fechaIngreso: isoADate(conductor.fechaIngreso),
      categoriaLicencia: conductor.categoriaLicencia ?? '',
      emergenciaNombre: conductor.emergenciaNombre ?? '',
      emergenciaTelefono: conductor.emergenciaTelefono ?? '',
      emergenciaRelacion: conductor.emergenciaRelacion ?? '',
    });
    setEditando(true);
  }

  const mutation = useMutation({
    mutationFn: async (values: DatosFormValues) => {
      const payload: Record<string, unknown> = {};
      if (values.curp.trim()) payload.curp = values.curp.trim();
      if (values.rfc.trim()) payload.rfc = values.rfc.trim();
      if (values.nss.trim()) payload.nss = values.nss.trim();
      if (values.fechaNacimiento) {
        payload.fechaNacimiento = new Date(values.fechaNacimiento).toISOString();
      }
      if (values.tipoSangre.trim()) payload.tipoSangre = values.tipoSangre.trim();
      if (values.direccion.trim()) payload.direccion = values.direccion.trim();
      if (values.numeroEmpleado.trim()) payload.numeroEmpleado = values.numeroEmpleado.trim();
      if (values.puesto.trim()) payload.puesto = values.puesto.trim();
      if (values.fechaIngreso) {
        payload.fechaIngreso = new Date(values.fechaIngreso).toISOString();
      }
      if (values.categoriaLicencia) payload.categoriaLicencia = values.categoriaLicencia;
      if (values.emergenciaNombre.trim()) payload.emergenciaNombre = values.emergenciaNombre.trim();
      if (values.emergenciaTelefono.trim()) payload.emergenciaTelefono = values.emergenciaTelefono.trim();
      if (values.emergenciaRelacion.trim()) payload.emergenciaRelacion = values.emergenciaRelacion.trim();

      const { data } = await api.patch<ConductorDetalle>(`/conductores/${conductorId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductor', conductorId] });
      toast.success('Datos del conductor actualizados');
      setEditando(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  // ── Estado de carga ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="py-6 text-center text-sm text-destructive">
        No se pudieron cargar los datos del conductor.
      </p>
    );
  }

  // ── Modo edición ─────────────────────────────────────────────────────────────

  if (editando) {
    return (
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Editando datos del expediente</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditando(false)}
              disabled={mutation.isPending}
            >
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              <Check className="mr-1 h-4 w-4" />
              {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* Datos personales */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <CamposGrid cols={3}>
              <Campo label="CURP" htmlFor="curp">
                <Input id="curp" {...register('curp')} />
              </Campo>
              <Campo label="Fecha de nacimiento" htmlFor="fechaNacimiento">
                <Input id="fechaNacimiento" type="date" {...register('fechaNacimiento')} />
              </Campo>
              <Campo label="Tipo de sangre">
                <CatalogoSelect
                  grupo="TIPO_SANGRE"
                  value={watch('tipoSangre')}
                  onChange={(c) => setValue('tipoSangre', c)}
                  placeholder="Selecciona…"
                />
              </Campo>
              <Campo label="Dirección" htmlFor="direccion" full>
                <Input id="direccion" {...register('direccion')} />
              </Campo>
            </CamposGrid>
          </CardContent>
        </Card>

        {/* Datos fiscales / IMSS */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Datos fiscales / IMSS
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <CamposGrid cols={3}>
              <Campo label="RFC" htmlFor="rfc">
                <Input id="rfc" {...register('rfc')} />
              </Campo>
              <Campo label="NSS (IMSS)" htmlFor="nss">
                <Input id="nss" {...register('nss')} />
              </Campo>
            </CamposGrid>
          </CardContent>
        </Card>

        {/* Licencia */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Licencia federal
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <CamposGrid cols={3}>
              <Campo label="Categoría de licencia">
                <CatalogoSelect
                  grupo="CATEGORIA_LICENCIA"
                  value={watch('categoriaLicencia')}
                  onChange={(c) => setValue('categoriaLicencia', c)}
                  placeholder="Sin categoría"
                />
              </Campo>
            </CamposGrid>
          </CardContent>
        </Card>

        {/* Empleo */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Empleo
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <CamposGrid cols={3}>
              <Campo label="No. de empleado" htmlFor="numeroEmpleado">
                <Input id="numeroEmpleado" {...register('numeroEmpleado')} />
              </Campo>
              <Campo label="Puesto">
                <CatalogoSelect
                  grupo="PUESTO"
                  value={watch('puesto')}
                  onChange={(c) => setValue('puesto', c)}
                  placeholder="Selecciona…"
                />
              </Campo>
              <Campo label="Fecha de ingreso" htmlFor="fechaIngreso">
                <Input id="fechaIngreso" type="date" {...register('fechaIngreso')} />
              </Campo>
            </CamposGrid>
          </CardContent>
        </Card>

        {/* Contacto de emergencia */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contacto de emergencia
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <CamposGrid cols={3}>
              <Campo label="Nombre" htmlFor="emergenciaNombre">
                <Input id="emergenciaNombre" {...register('emergenciaNombre')} />
              </Campo>
              <Campo label="Teléfono" htmlFor="emergenciaTelefono">
                <Input id="emergenciaTelefono" {...register('emergenciaTelefono')} />
              </Campo>
              <Campo label="Relación" htmlFor="emergenciaRelacion">
                <Input id="emergenciaRelacion" placeholder="Ej. Esposa, Madre…" {...register('emergenciaRelacion')} />
              </Campo>
            </CamposGrid>
          </CardContent>
        </Card>
      </form>
    );
  }

  // ── Modo vista ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => iniciarEdicion(data)}>
          <Pencil className="mr-1 h-4 w-4" />
          Editar datos
        </Button>
      </div>

      <Seccion title="Datos personales">
        <DetalleItem label="CURP" value={data.curp} />
        <DetalleItem label="Fecha de nacimiento" value={displayDate(data.fechaNacimiento)} />
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Tipo de sangre</p>
          <p className="text-sm font-medium">
            {data.tipoSangre
              ? <CatalogoTexto grupo="TIPO_SANGRE" codigo={data.tipoSangre} />
              : '—'}
          </p>
        </div>
        <DetalleItem label="Dirección" value={data.direccion} />
      </Seccion>

      <Seccion title="Datos fiscales / IMSS">
        <DetalleItem label="RFC" value={data.rfc} />
        <DetalleItem label="NSS (IMSS)" value={data.nss} />
      </Seccion>

      <Seccion title="Licencia federal">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Categoría de licencia</p>
          <p className="text-sm font-medium">
            {data.categoriaLicencia
              ? <CatalogoTexto grupo="CATEGORIA_LICENCIA" codigo={data.categoriaLicencia} />
              : '—'}
          </p>
        </div>
      </Seccion>

      <Seccion title="Empleo">
        <DetalleItem label="No. de empleado" value={data.numeroEmpleado} />
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Puesto</p>
          <p className="text-sm font-medium">
            {data.puesto
              ? <CatalogoTexto grupo="PUESTO" codigo={data.puesto} />
              : '—'}
          </p>
        </div>
        <DetalleItem label="Fecha de ingreso" value={displayDate(data.fechaIngreso)} />
      </Seccion>

      <Seccion title="Contacto de emergencia">
        <DetalleItem label="Nombre" value={data.emergenciaNombre} />
        <DetalleItem label="Teléfono" value={data.emergenciaTelefono} />
        <DetalleItem label="Relación" value={data.emergenciaRelacion} />
      </Seccion>
    </div>
  );
}
