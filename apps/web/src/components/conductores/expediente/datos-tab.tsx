'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, X, Check } from 'lucide-react';
import { CategoriaLicencia } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  categoriaLicencia: CategoriaLicencia | null;
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

const CATEGORIAS_LICENCIA = Object.values(CategoriaLicencia);

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
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

  const categoriaLicenciaValue = watch('categoriaLicencia');

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
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="curp">CURP</Label>
                <Input id="curp" {...register('curp')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                <Input id="fechaNacimiento" type="date" {...register('fechaNacimiento')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipoSangre">Tipo de sangre</Label>
                <Input id="tipoSangre" placeholder="Ej. O+" {...register('tipoSangre')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" {...register('direccion')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos fiscales / IMSS */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Datos fiscales / IMSS
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rfc">RFC</Label>
                <Input id="rfc" {...register('rfc')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nss">NSS (IMSS)</Label>
                <Input id="nss" {...register('nss')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Licencia */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Licencia federal
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoría de licencia</Label>
                <Select
                  value={categoriaLicenciaValue}
                  onValueChange={(v) => setValue('categoriaLicencia', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin categoría</SelectItem>
                    {CATEGORIAS_LICENCIA.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        Categoría {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empleo */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Empleo
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="numeroEmpleado">No. de empleado</Label>
                <Input id="numeroEmpleado" {...register('numeroEmpleado')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="puesto">Puesto</Label>
                <Input id="puesto" {...register('puesto')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fechaIngreso">Fecha de ingreso</Label>
                <Input id="fechaIngreso" type="date" {...register('fechaIngreso')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacto de emergencia */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contacto de emergencia
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="emergenciaNombre">Nombre</Label>
                <Input id="emergenciaNombre" {...register('emergenciaNombre')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergenciaTelefono">Teléfono</Label>
                <Input id="emergenciaTelefono" {...register('emergenciaTelefono')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergenciaRelacion">Relación</Label>
                <Input id="emergenciaRelacion" placeholder="Ej. Esposa, Madre…" {...register('emergenciaRelacion')} />
              </div>
            </div>
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
        <DetalleItem label="Tipo de sangre" value={data.tipoSangre} />
        <DetalleItem label="Dirección" value={data.direccion} />
      </Seccion>

      <Seccion title="Datos fiscales / IMSS">
        <DetalleItem label="RFC" value={data.rfc} />
        <DetalleItem label="NSS (IMSS)" value={data.nss} />
      </Seccion>

      <Seccion title="Licencia federal">
        <DetalleItem
          label="Categoría de licencia"
          value={data.categoriaLicencia ? `Categoría ${data.categoriaLicencia}` : null}
        />
      </Seccion>

      <Seccion title="Empleo">
        <DetalleItem label="No. de empleado" value={data.numeroEmpleado} />
        <DetalleItem label="Puesto" value={data.puesto} />
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
