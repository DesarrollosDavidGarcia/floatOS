'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Campo } from '@/components/conductores/expediente/form-ui';
import {
  useClientesCatalogo,
  useConductoresCatalogo,
  useUnidadesCatalogo,
} from '../catalogos';
import { ConductorSelectItems } from '../conductor-select-items';
import type { Viaje } from '../types';
import { ItinerarioBuilder } from './itinerario-builder';
import { PanelMotor } from './panel-motor';
import {
  NINGUNO,
  defaultsCrear,
  defaultsDeViaje,
  escalasParaEnviar,
  toCrearPayload,
  viajeFormSchema,
  type ViajeFormValues,
} from './form-types';

export function ViajeFormPage({
  mode,
  viaje,
}: {
  mode: 'crear' | 'editar';
  viaje?: Viaje;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const clientes = useClientesCatalogo();
  const unidades = useUnidadesCatalogo();
  const conductores = useConductoresCatalogo();

  const form = useForm<ViajeFormValues>({
    resolver: zodResolver(viajeFormSchema),
    mode: 'onTouched',
    defaultValues:
      mode === 'editar' && viaje ? defaultsDeViaje(viaje) : defaultsCrear(),
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  const guardar = useMutation({
    mutationFn: async (values: ViajeFormValues) => {
      if (mode === 'crear') {
        const { data } = await api.post<Viaje>('/viajes', toCrearPayload(values));
        return data;
      }
      const id = viaje!.id;
      await api.patch(`/viajes/${id}`, {
        escalas: escalasParaEnviar(values),
        fechaProgramada: values.fechaProgramada
          ? new Date(values.fechaProgramada).toISOString()
          : undefined,
        tipoServicio: values.tipoServicio,
        numPasajeros:
          values.tipoServicio === 'PERSONAL'
            ? Number(values.numPasajeros)
            : undefined,
      });
      await api.patch(`/viajes/${id}/asignar`, {
        unidadId: values.unidadId !== NINGUNO ? values.unidadId : null,
        conductorId: values.conductorId !== NINGUNO ? values.conductorId : null,
      });
      return { id } as Viaje;
    },
    onSuccess: (v) => {
      toast.success(mode === 'crear' ? 'Viaje creado' : 'Viaje actualizado');
      invalidarViajes(qc, v.id);
      // La disponibilidad de los conductores cambió (chips del selector).
      void qc.invalidateQueries({ queryKey: ['catalogo', 'conductores'] });
      router.push(`/viajes/${v.id}`);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const tipoServicio = watch('tipoServicio');
  const clienteId = watch('clienteId');
  const unidadId = watch('unidadId');
  const conductorId = watch('conductorId');
  const esPersonal = tipoServicio === 'PERSONAL';

  const volver = mode === 'editar' && viaje ? `/viajes/${viaje.id}` : '/viajes';

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit((v) => guardar.mutate(v))}
        className="space-y-5"
      >
        {/* Encabezado */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Volver">
              <Link href={volver}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {mode === 'crear' ? 'Nuevo viaje' : `Editar viaje #${viaje?.folio}`}
            </h1>
          </div>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending
              ? 'Guardando…'
              : mode === 'crear'
                ? 'Crear viaje'
                : 'Guardar cambios'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Izquierda: itinerario */}
          <div className="lg:col-span-2">
            <ItinerarioBuilder />
          </div>

          {/* Derecha: datos del viaje + motor */}
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-sm font-semibold">Datos del viaje</h2>

              <Campo label="Tipo de servicio" htmlFor="tipoServicio" full>
                <Select
                  value={tipoServicio}
                  onValueChange={(v) =>
                    setValue('tipoServicio', v as 'CARGA' | 'PERSONAL', {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="tipoServicio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARGA">Carga (mercancía)</SelectItem>
                    <SelectItem value="PERSONAL">Personal (pasajeros)</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>

              {esPersonal && (
                <Campo label="N° de pasajeros" htmlFor="numPasajeros" required error={errors.numPasajeros?.message} full>
                  <Input id="numPasajeros" type="number" min="1" step="1" {...register('numPasajeros')} />
                </Campo>
              )}

              <Campo label="Cliente" htmlFor="clienteId" required error={errors.clienteId?.message} full>
                <Select
                  value={clienteId || undefined}
                  onValueChange={(v) => setValue('clienteId', v, { shouldValidate: true })}
                >
                  <SelectTrigger id="clienteId">
                    <SelectValue placeholder={clientes.isLoading ? 'Cargando…' : 'Selecciona un cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientes.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Fecha programada" htmlFor="fechaProgramada" full>
                <Input id="fechaProgramada" type="datetime-local" {...register('fechaProgramada')} />
              </Campo>

              <Campo label="Unidad" htmlFor="unidadId" full>
                <Select value={unidadId} onValueChange={(v) => setValue('unidadId', v)}>
                  <SelectTrigger id="unidadId">
                    <SelectValue placeholder={unidades.isLoading ? 'Cargando…' : 'Sin asignar'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                    {(unidades.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              <Campo label="Conductor" htmlFor="conductorId" full>
                <Select value={conductorId} onValueChange={(v) => setValue('conductorId', v)}>
                  <SelectTrigger id="conductorId">
                    <SelectValue placeholder={conductores.isLoading ? 'Cargando…' : 'Sin asignar'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                    <ConductorSelectItems
                      conductores={conductores.data ?? []}
                      viajeIdActual={viaje?.id}
                    />
                  </SelectContent>
                </Select>
              </Campo>
            </div>

            {/* El motor de peso/volumen/idoneidad solo aplica a carga. */}
            {!esPersonal && <PanelMotor />}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
