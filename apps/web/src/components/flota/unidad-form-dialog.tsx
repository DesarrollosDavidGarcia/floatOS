'use client';

import { useEffect, useState } from 'react';
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
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { useEntityFormDialog } from '@/lib/use-entity-form-dialog';
import type { Unidad } from './types';
import {
  unidadADefaults,
  unidadAPayload,
  unidadSchema,
  type UnidadFormValues,
} from './unidad-form-schema';

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
    UnidadFormValues,
    Unidad
  >({
    schema: unidadSchema,
    entity: unidad,
    open: openProp,
    onOpenChange,
    toDefaults: unidadADefaults,
    toPayload: unidadAPayload,
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
