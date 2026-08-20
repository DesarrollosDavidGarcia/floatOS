'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import type { Unidad } from './types';
import {
  unidadADefaults,
  unidadAPayload,
  unidadSchema,
  type UnidadFormValues,
} from './unidad-form-schema';

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
 * Datos escalares de la unidad en página completa: identificación, capacidades
 * y consumo, y seguro. El costo por km NO está aquí — se arma por conceptos en
 * su propia pestaña.
 */
export function UnidadDatosForm({ unidad }: { unidad: Unidad }) {
  const qc = useQueryClient();
  const form = useForm<UnidadFormValues>({
    resolver: zodResolver(unidadSchema),
    mode: 'onTouched',
    defaultValues: unidadADefaults(unidad),
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form;

  // Al llegar los datos (o al recargarse tras guardar) el formulario se resetea
  // con lo que hay en el servidor, para que `isDirty` vuelva a ser fiable.
  useEffect(() => {
    reset(unidadADefaults(unidad));
  }, [unidad, reset]);

  const guardar = useMutation({
    mutationFn: async (values: UnidadFormValues) => {
      const { data } = await api.patch<Unidad>(
        `/unidades/${unidad.id}`,
        unidadAPayload(values),
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Unidad actualizada');
      void qc.invalidateQueries({ queryKey: ['unidad', unidad.id] });
      void qc.invalidateQueries({ queryKey: ['unidades'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => guardar.mutate(v))}
      className="space-y-4"
    >
      <Seccion titulo="Identificación">
        <CamposGrid cols={3}>
          <Campo label="Placas" htmlFor="placas" required error={errors.placas?.message}>
            <Input id="placas" {...register('placas')} />
          </Campo>
          <Campo label="Tipo" required error={errors.tipo?.message}>
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <CatalogoSelect
                  grupo="TIPO_UNIDAD"
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecciona…"
                  ariaLabel="Tipo de unidad"
                />
              )}
            />
          </Campo>
          <Campo label="Año" htmlFor="anio" error={errors.anio?.message}>
            <Input id="anio" inputMode="numeric" {...register('anio')} />
          </Campo>
          <Campo label="Marca" error={errors.marca?.message}>
            <Controller
              control={control}
              name="marca"
              render={({ field }) => (
                <CatalogoSelect
                  grupo="MARCA_UNIDAD"
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecciona…"
                  ariaLabel="Marca"
                />
              )}
            />
          </Campo>
          <Campo label="Modelo" error={errors.modelo?.message}>
            <Controller
              control={control}
              name="modelo"
              render={({ field }) => (
                <CatalogoSelect
                  grupo="MODELO_UNIDAD"
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecciona…"
                  ariaLabel="Modelo"
                />
              )}
            />
          </Campo>
        </CamposGrid>
      </Seccion>

      <Seccion titulo="Capacidad y consumo">
        <CamposGrid cols={3}>
          <Campo label="Capacidad (kg)" htmlFor="capacidadKg" error={errors.capacidadKg?.message}>
            <Input id="capacidadKg" inputMode="decimal" {...register('capacidadKg')} />
          </Campo>
          <Campo label="Capacidad (m³)" htmlFor="capacidadM3" error={errors.capacidadM3?.message}>
            <Input id="capacidadM3" inputMode="decimal" {...register('capacidadM3')} />
          </Campo>
          <Campo
            label="Pasajeros"
            htmlFor="capacidadPasajeros"
            error={errors.capacidadPasajeros?.message}
            hint="Solo unidades de transporte de personal."
          >
            <Input id="capacidadPasajeros" inputMode="numeric" {...register('capacidadPasajeros')} />
          </Campo>
          <Campo
            label="Rendimiento (km/L)"
            htmlFor="rendimientoKmL"
            error={errors.rendimientoKmL?.message}
            hint="Con esto se estima el diesel del viaje cuando no hay ticket."
          >
            <Input id="rendimientoKmL" inputMode="decimal" {...register('rendimientoKmL')} />
          </Campo>
          <Campo
            label="Tanque (L)"
            htmlFor="capacidadTanqueL"
            error={errors.capacidadTanqueL?.message}
          >
            <Input id="capacidadTanqueL" inputMode="decimal" {...register('capacidadTanqueL')} />
          </Campo>
        </CamposGrid>
      </Seccion>

      <Seccion titulo="Costo fijo y seguro">
        <CamposGrid cols={3}>
          <Campo
            label="Costo fijo mensual"
            htmlFor="costoFijoMensual"
            error={errors.costoFijoMensual?.message}
            hint="Seguro, tenencia, financiamiento: corre aunque no salga a ruta."
          >
            <Input id="costoFijoMensual" inputMode="decimal" {...register('costoFijoMensual')} />
          </Campo>
          <Campo label="Aseguradora" error={errors.aseguradora?.message}>
            <Controller
              control={control}
              name="aseguradora"
              render={({ field }) => (
                <CatalogoSelect
                  grupo="ASEGURADORA"
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Selecciona…"
                  ariaLabel="Aseguradora"
                />
              )}
            />
          </Campo>
          <Campo label="Número de póliza" htmlFor="numeroPoliza" error={errors.numeroPoliza?.message}>
            <Input id="numeroPoliza" {...register('numeroPoliza')} />
          </Campo>
        </CamposGrid>
      </Seccion>

      <div className="flex justify-end">
        <Button type="submit" disabled={guardar.isPending || !isDirty}>
          <Save className="mr-2 h-4 w-4" />
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
