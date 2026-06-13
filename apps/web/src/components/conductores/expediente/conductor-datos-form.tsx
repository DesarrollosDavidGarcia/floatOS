'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import type { Conductor } from '@/components/conductores/types';
import {
  conductorFormSchema,
  defaultsCrear,
  defaultsDeConductor,
  toPayload,
  type ConductorFormValues,
} from '@/components/conductores/form/form-types';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Formulario único con TODOS los datos escalares del conductor (generales,
 * acceso, contratación y expediente RH). Se usa tanto al crear (página de alta)
 * como en la pestaña "Datos" del expediente. El backend acepta todos los campos.
 */
export function ConductorDatosForm({
  mode,
  conductor,
  onCreated,
}: {
  mode: 'crear' | 'editar';
  conductor?: Conductor;
  /** Se invoca con el conductor creado (solo en modo crear). */
  onCreated?: (c: Conductor) => void;
}) {
  const qc = useQueryClient();

  const form = useForm<ConductorFormValues>({
    resolver: zodResolver(conductorFormSchema),
    mode: 'onTouched',
    defaultValues:
      mode === 'editar' && conductor ? defaultsDeConductor(conductor) : defaultsCrear(),
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = form;

  const tipo = watch('tipoContratacion');
  const externo = tipo === 'FREELANCE' || tipo === 'TERCIARIZADO';
  const terciarizado = tipo === 'TERCIARIZADO';

  const guardar = useMutation({
    mutationFn: async (values: ConductorFormValues) => {
      const payload = toPayload(values);
      if (mode === 'crear') {
        const { data } = await api.post<Conductor>('/conductores', payload);
        return data;
      }
      const { data } = await api.patch<Conductor>(`/conductores/${conductor!.id}`, payload);
      return data;
    },
    onSuccess: (c) => {
      toast.success(mode === 'crear' ? 'Conductor creado' : 'Datos guardados');
      qc.invalidateQueries({ queryKey: ['conductores'] });
      if (mode === 'crear') {
        onCreated?.(c);
      } else if (conductor) {
        qc.invalidateQueries({ queryKey: ['conductor', conductor.id] });
        // Re-sincroniza el formulario con lo persistido (limpia password, etc.).
        reset(defaultsDeConductor(c));
      }
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <form onSubmit={handleSubmit((v) => guardar.mutate(v))} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {mode === 'crear'
            ? 'Captura los datos del conductor. Podrás gestionar documentos y demás secciones al guardar.'
            : 'Datos generales y de expediente del conductor.'}
        </p>
        <Button type="submit" disabled={guardar.isPending}>
          <Save className="h-4 w-4" />
          {guardar.isPending
            ? 'Guardando…'
            : mode === 'crear'
              ? 'Crear conductor'
              : 'Guardar cambios'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Datos generales */}
        <Seccion titulo="Datos generales">
          <CamposGrid cols={2}>
            <Campo label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
              <Input id="nombre" {...register('nombre')} />
            </Campo>
            <Campo label="Apellidos" htmlFor="apellidos" error={errors.apellidos?.message}>
              <Input id="apellidos" {...register('apellidos')} />
            </Campo>
            <Campo label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
              <Input id="telefono" inputMode="tel" {...register('telefono')} />
            </Campo>
            <Campo label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Campo>
          </CamposGrid>
        </Seccion>

        {/* Acceso a la app */}
        <Seccion titulo="Acceso a la app">
          <CamposGrid cols={2}>
            <Campo label="Usuario" htmlFor="usuario" required error={errors.usuario?.message}>
              <Input id="usuario" autoComplete="off" {...register('usuario')} />
            </Campo>
            <Campo
              label="Contraseña"
              htmlFor="password"
              required={mode === 'crear'}
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={mode === 'editar' ? 'Dejar vacío para no cambiar' : undefined}
                {...register('password')}
              />
            </Campo>
          </CamposGrid>
        </Seccion>
      </div>

      {/* Contratación */}
      <Seccion titulo="Contratación">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo label="Tipo de contratación" required error={errors.tipoContratacion?.message}>
            <Controller
              control={control}
              name="tipoContratacion"
              render={({ field }) => (
                <CatalogoSelect
                  grupo="TIPO_CONTRATACION"
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecciona…"
                />
              )}
            />
          </Campo>
        </div>

        {externo && (
          <div className="space-y-4 rounded-md border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {terciarizado
                ? 'Conductor externo prestado por otra empresa.'
                : 'Conductor freelance / temporal.'}
            </p>
            {terciarizado && (
              <CamposGrid cols={2}>
                <Campo label="Empresa proveedora" htmlFor="empresaProveedor" required error={errors.empresaProveedor?.message}>
                  <Input id="empresaProveedor" {...register('empresaProveedor')} placeholder="Razón social" />
                </Campo>
                <Campo label="RFC de la empresa" htmlFor="empresaProveedorRfc" error={errors.empresaProveedorRfc?.message}>
                  <Input id="empresaProveedorRfc" {...register('empresaProveedorRfc')} />
                </Campo>
                <Campo label="Contacto (nombre)" htmlFor="proveedorContactoNombre" error={errors.proveedorContactoNombre?.message}>
                  <Input id="proveedorContactoNombre" {...register('proveedorContactoNombre')} />
                </Campo>
                <Campo label="Contacto (teléfono)" htmlFor="proveedorContactoTelefono" error={errors.proveedorContactoTelefono?.message}>
                  <Input id="proveedorContactoTelefono" inputMode="tel" {...register('proveedorContactoTelefono')} />
                </Campo>
              </CamposGrid>
            )}
            <CamposGrid cols={3}>
              <Campo label="Vigencia desde" htmlFor="vigenciaDesde" error={errors.vigenciaDesde?.message}>
                <Input id="vigenciaDesde" type="date" {...register('vigenciaDesde')} />
              </Campo>
              <Campo label="Vigencia hasta" htmlFor="vigenciaHasta" error={errors.vigenciaHasta?.message}>
                <Input id="vigenciaHasta" type="date" {...register('vigenciaHasta')} />
              </Campo>
            </CamposGrid>
            <p className="text-xs text-muted-foreground">
              Si capturas “Vigencia hasta”, el centro de alertas avisará 7/3/1 días antes del vencimiento.
            </p>
            <Campo label="Notas de contratación" htmlFor="notasContratacion" error={errors.notasContratacion?.message}>
              <Textarea id="notasContratacion" rows={2} {...register('notasContratacion')} placeholder="Condiciones, tarifa, observaciones…" />
            </Campo>
          </div>
        )}
      </Seccion>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Datos personales */}
        <Seccion titulo="Datos personales">
          <CamposGrid cols={2}>
            <Campo label="CURP" htmlFor="curp" error={errors.curp?.message}>
              <Input id="curp" {...register('curp')} />
            </Campo>
            <Campo label="Fecha de nacimiento" htmlFor="fechaNacimiento">
              <Input id="fechaNacimiento" type="date" {...register('fechaNacimiento')} />
            </Campo>
            <Campo label="Tipo de sangre">
              <Controller
                control={control}
                name="tipoSangre"
                render={({ field }) => (
                  <CatalogoSelect grupo="TIPO_SANGRE" value={field.value || null} onChange={field.onChange} placeholder="Selecciona…" />
                )}
              />
            </Campo>
            <Campo label="Dirección" htmlFor="direccion" full>
              <Input id="direccion" {...register('direccion')} />
            </Campo>
          </CamposGrid>
        </Seccion>

        {/* Fiscales / IMSS */}
        <Seccion titulo="Fiscales / IMSS">
          <CamposGrid cols={2}>
            <Campo label="RFC" htmlFor="rfc" error={errors.rfc?.message}>
              <Input id="rfc" {...register('rfc')} />
            </Campo>
            <Campo label="NSS (IMSS)" htmlFor="nss" error={errors.nss?.message}>
              <Input id="nss" {...register('nss')} />
            </Campo>
          </CamposGrid>
        </Seccion>

        {/* Empleo */}
        <Seccion titulo="Empleo">
          <CamposGrid cols={2}>
            <Campo label="No. de empleado" htmlFor="numeroEmpleado">
              <Input id="numeroEmpleado" {...register('numeroEmpleado')} />
            </Campo>
            <Campo label="Puesto">
              <Controller
                control={control}
                name="puesto"
                render={({ field }) => (
                  <CatalogoSelect grupo="PUESTO" value={field.value || null} onChange={field.onChange} placeholder="Selecciona…" />
                )}
              />
            </Campo>
            <Campo label="Fecha de ingreso" htmlFor="fechaIngreso">
              <Input id="fechaIngreso" type="date" {...register('fechaIngreso')} />
            </Campo>
            <Campo label="Categoría de licencia">
              <Controller
                control={control}
                name="categoriaLicencia"
                render={({ field }) => (
                  <CatalogoSelect grupo="CATEGORIA_LICENCIA" value={field.value || null} onChange={field.onChange} placeholder="Sin categoría" />
                )}
              />
            </Campo>
          </CamposGrid>
        </Seccion>

        {/* Contacto de emergencia */}
        <Seccion titulo="Contacto de emergencia">
          <CamposGrid cols={2}>
            <Campo label="Nombre" htmlFor="emergenciaNombre">
              <Input id="emergenciaNombre" {...register('emergenciaNombre')} />
            </Campo>
            <Campo label="Teléfono" htmlFor="emergenciaTelefono" error={errors.emergenciaTelefono?.message}>
              <Input id="emergenciaTelefono" inputMode="tel" {...register('emergenciaTelefono')} />
            </Campo>
            <Campo label="Relación" htmlFor="emergenciaRelacion" full>
              <Input id="emergenciaRelacion" placeholder="Ej. Esposa, Madre…" {...register('emergenciaRelacion')} />
            </Campo>
          </CamposGrid>
        </Seccion>
      </div>
    </form>
  );
}
