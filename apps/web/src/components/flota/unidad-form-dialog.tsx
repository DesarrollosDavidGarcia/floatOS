'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { UnidadFotoUploader } from '@/components/flota/unidad-foto';
import {
  Campo,
  CamposGrid,
  SeccionHeader,
} from '@/components/conductores/expediente/form-ui';
import { textoRequerido, seleccionRequerida, numeroOpcional } from '@/lib/validacion';
import { useEntityFormDialog } from '@/lib/use-entity-form-dialog';
import type { Unidad } from './types';

const schema = z.object({
  placas:       textoRequerido('Las placas son obligatorias'),
  tipo:         seleccionRequerida('Selecciona el tipo de unidad'),
  marca:        z.string().trim().optional(),
  modelo:       z.string().trim().optional(),
  anio:         numeroOpcional({ min: 1950, max: 2100, entero: true }),
  capacidadKg:  numeroOpcional({ min: 0 }),
  capacidadM3:  numeroOpcional({ min: 0 }),
  rendimientoKmL: numeroOpcional({ min: 0 }),
  capacidadTanqueL: numeroOpcional({ min: 0 }),
  capacidadPasajeros: numeroOpcional({ min: 0, entero: true }),
  costoMantenimientoPorKm: numeroOpcional({ min: 0 }),
  costoFijoMensual: numeroOpcional({ min: 0 }),
  aseguradora:  z.string().trim().optional(),
  numeroPoliza: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDefaults(unidad?: Unidad | null): FormValues {
  return {
    placas:       unidad?.placas ?? '',
    tipo:         unidad?.tipo ?? '',
    marca:        unidad?.marca ?? '',
    modelo:       unidad?.modelo ?? '',
    anio:         unidad?.anio != null ? String(unidad.anio) : '',
    capacidadKg:  unidad?.capacidadKg != null ? String(unidad.capacidadKg) : '',
    capacidadM3:  unidad?.capacidadM3 != null ? String(unidad.capacidadM3) : '',
    rendimientoKmL:
      unidad?.rendimientoKmL != null ? String(unidad.rendimientoKmL) : '',
    capacidadTanqueL:
      unidad?.capacidadTanqueL != null ? String(unidad.capacidadTanqueL) : '',
    capacidadPasajeros:
      unidad?.capacidadPasajeros != null ? String(unidad.capacidadPasajeros) : '',
    costoMantenimientoPorKm:
      unidad?.costoMantenimientoPorKm != null
        ? String(unidad.costoMantenimientoPorKm)
        : '',
    costoFijoMensual:
      unidad?.costoFijoMensual != null ? String(unidad.costoFijoMensual) : '',
    aseguradora:  unidad?.aseguradora ?? '',
    numeroPoliza: unidad?.numeroPoliza ?? '',
  };
}

function toPayload(values: FormValues) {
  return {
    placas:       values.placas,
    tipo:         values.tipo,
    marca:        values.marca || undefined,
    modelo:       values.modelo || undefined,
    anio:         values.anio ? Number(values.anio) : undefined,
    capacidadKg:  values.capacidadKg ? Number(values.capacidadKg) : undefined,
    capacidadM3:  values.capacidadM3 ? Number(values.capacidadM3) : undefined,
    rendimientoKmL: values.rendimientoKmL
      ? Number(values.rendimientoKmL)
      : undefined,
    capacidadTanqueL: values.capacidadTanqueL
      ? Number(values.capacidadTanqueL)
      : undefined,
    capacidadPasajeros: values.capacidadPasajeros
      ? Number(values.capacidadPasajeros)
      : undefined,
    costoMantenimientoPorKm: values.costoMantenimientoPorKm
      ? Number(values.costoMantenimientoPorKm)
      : undefined,
    costoFijoMensual: values.costoFijoMensual
      ? Number(values.costoFijoMensual)
      : undefined,
    aseguradora:  values.aseguradora || undefined,
    numeroPoliza: values.numeroPoliza || undefined,
  };
}

export function UnidadFormDialog({
  unidad,
  open: openProp,
  onOpenChange,
}: {
  unidad?: Unidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Foto elegida al crear una unidad nueva: se sube tras crearla (afterSave).
  const [fotoNueva, setFotoNueva] = useState<File | null>(null);

  const { open, setOpen, form, editando, submit, isPending } = useEntityFormDialog<
    FormValues,
    Unidad
  >({
    schema,
    entity: unidad,
    open: openProp,
    onOpenChange,
    toDefaults,
    toPayload,
    endpoint: '/unidades',
    invalidateKeys: [['unidades']],
    mensajes: { creado: 'Unidad creada', actualizado: 'Unidad actualizada' },
    // Solo al crear: sube la foto pendiente a la unidad recién creada. Si falla,
    // la unidad ya quedó creada — se avisa pero no se aborta el cierre.
    afterSave: async (creada) => {
      if (editando || !fotoNueva) return;
      try {
        const fd = new FormData();
        fd.append('foto', fotoNueva);
        await api.post(`/unidades/${creada.id}/foto`, fd, {
          headers: { 'Content-Type': undefined },
        });
      } catch (err) {
        toast.error(`Unidad creada, pero la foto no se subió: ${apiError(err)}`);
      }
    },
  });

  // Limpia la foto pendiente cuando el diálogo se cierra (o se reabre).
  useEffect(() => {
    if (!open) setFotoNueva(null);
  }, [open]);
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar unidad' : 'Nueva unidad'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Modifica los datos de la unidad.'
              : 'Registra una nueva unidad de la flotilla.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {editando && unidad ? (
            <UnidadFotoUploader unidad={unidad} />
          ) : (
            <UnidadFotoUploader
              pendingFile={fotoNueva}
              onPick={setFotoNueva}
              placas={watch('placas') || 'nueva'}
            />
          )}

          <CamposGrid cols={2}>
            <Campo
              label="Placas"
              htmlFor="placas"
              required
              error={errors.placas?.message}
            >
              <Input id="placas" autoFocus {...register('placas')} />
            </Campo>

            <Campo
              label="Tipo"
              required
              error={errors.tipo?.message}
            >
              <CatalogoSelect
                grupo="TIPO_UNIDAD"
                value={watch('tipo')}
                onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
                placeholder="Selecciona el tipo"
                ariaLabel="Tipo de unidad"
              />
            </Campo>

            <Campo label="Marca" error={errors.marca?.message}>
              <CatalogoSelect
                grupo="MARCA_UNIDAD"
                value={watch('marca') ?? ''}
                onChange={(c) => setValue('marca', c, { shouldValidate: true })}
                placeholder="Selecciona…"
                ariaLabel="Marca"
              />
            </Campo>

            <Campo label="Modelo" error={errors.modelo?.message}>
              <CatalogoSelect
                grupo="MODELO_UNIDAD"
                value={watch('modelo') ?? ''}
                onChange={(c) => setValue('modelo', c, { shouldValidate: true })}
                placeholder="Selecciona…"
                ariaLabel="Modelo"
              />
            </Campo>

            <Campo
              label="Año"
              htmlFor="anio"
              error={errors.anio?.message}
            >
              <Input id="anio" inputMode="numeric" {...register('anio')} />
            </Campo>

            <Campo
              label="Capacidad (kg)"
              htmlFor="capacidadKg"
              error={errors.capacidadKg?.message}
            >
              <Input id="capacidadKg" inputMode="numeric" {...register('capacidadKg')} />
            </Campo>

            <Campo
              label="Aseguradora"
              error={errors.aseguradora?.message}
            >
              <CatalogoSelect
                grupo="ASEGURADORA"
                value={watch('aseguradora') ?? ''}
                onChange={(c) => setValue('aseguradora', c, { shouldValidate: true })}
                placeholder="Selecciona…"
                ariaLabel="Aseguradora"
              />
            </Campo>

            <Campo
              label="Número de póliza"
              htmlFor="numeroPoliza"
              error={errors.numeroPoliza?.message}
            >
              <Input id="numeroPoliza" {...register('numeroPoliza')} />
            </Campo>
          </CamposGrid>

          <SeccionHeader titulo="Capacidad y consumo" />
          <CamposGrid cols={2}>
            <Campo
              label="Capacidad (m³)"
              htmlFor="capacidadM3"
              error={errors.capacidadM3?.message}
            >
              <Input id="capacidadM3" inputMode="decimal" {...register('capacidadM3')} />
            </Campo>

            <Campo
              label="Rendimiento (km/L)"
              htmlFor="rendimientoKmL"
              error={errors.rendimientoKmL?.message}
              hint="Alimenta el diesel estimado del viaje cuando no hay ticket."
            >
              <Input
                id="rendimientoKmL"
                inputMode="decimal"
                {...register('rendimientoKmL')}
              />
            </Campo>

            <Campo
              label="Tanque (L)"
              htmlFor="capacidadTanqueL"
              error={errors.capacidadTanqueL?.message}
            >
              <Input
                id="capacidadTanqueL"
                inputMode="decimal"
                {...register('capacidadTanqueL')}
              />
            </Campo>

            <Campo
              label="Pasajeros"
              htmlFor="capacidadPasajeros"
              error={errors.capacidadPasajeros?.message}
              hint="Solo unidades de transporte de personal."
            >
              <Input
                id="capacidadPasajeros"
                inputMode="numeric"
                {...register('capacidadPasajeros')}
              />
            </Campo>
          </CamposGrid>

          <SeccionHeader titulo="Costos de operación" />
          <CamposGrid cols={2}>
            <Campo
              label="Mantenimiento por km"
              htmlFor="costoMantenimientoPorKm"
              error={errors.costoMantenimientoPorKm?.message}
              hint="Sin diesel: el combustible se calcula aparte."
            >
              <Input
                id="costoMantenimientoPorKm"
                inputMode="decimal"
                {...register('costoMantenimientoPorKm')}
              />
            </Campo>

            <Campo
              label="Costo fijo mensual"
              htmlFor="costoFijoMensual"
              error={errors.costoFijoMensual?.message}
              hint="Seguro, tenencia, financiamiento."
            >
              <Input
                id="costoFijoMensual"
                inputMode="decimal"
                {...register('costoFijoMensual')}
              />
            </Campo>
          </CamposGrid>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear unidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
