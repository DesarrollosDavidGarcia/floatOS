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

/**
 * Alta rápida de una unidad: solo lo que la identifica. El resto —capacidades,
 * consumo y costos de operación— se captura en la ficha, así que al crearla se
 * entra directo ahí en vez de dejar al usuario frente a una unidad a medias.
 *
 * La edición NO pasa por aquí: es demasiada información para un modal.
 */
export function UnidadFormDialog({
  open: openProp,
  onOpenChange,
  onCreada,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreada?: (unidad: Unidad) => void;
}) {
  // Foto elegida durante el alta: se sube cuando la unidad ya tiene id.
  const [fotoNueva, setFotoNueva] = useState<File | null>(null);

  const { open, setOpen, form, submit, isPending } = useEntityFormDialog<
    UnidadFormValues,
    Unidad
  >({
    schema: unidadSchema,
    entity: null,
    open: openProp,
    onOpenChange,
    toDefaults: unidadADefaults,
    toPayload: unidadAPayload,
    endpoint: '/unidades',
    invalidateKeys: [['unidades']],
    mensajes: { creado: 'Unidad creada', actualizado: 'Unidad actualizada' },
    afterSave: async (creada) => {
      if (fotoNueva) {
        try {
          const fd = new FormData();
          fd.append('foto', fotoNueva);
          await api.post(`/unidades/${creada.id}/foto`, fd, {
            headers: { 'Content-Type': undefined },
          });
        } catch (err) {
          // La unidad ya quedó creada: se avisa, pero no se aborta el paso a la ficha.
          toast.error(`Unidad creada, pero la foto no se subió: ${apiError(err)}`);
        }
      }
      onCreada?.(creada);
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
          <DialogTitle>Nueva unidad</DialogTitle>
          <DialogDescription>
            Con las placas y el tipo basta para darla de alta. Al crearla se abre
            su ficha para capturar capacidades, consumo y costos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <UnidadFotoUploader
            pendingFile={fotoNueva}
            onPick={setFotoNueva}
            placas={watch('placas') || 'nueva'}
          />

          <CamposGrid cols={2}>
            <Campo label="Placas" htmlFor="placas" required error={errors.placas?.message}>
              <Input id="placas" autoFocus {...register('placas')} />
            </Campo>

            <Campo label="Tipo" required error={errors.tipo?.message}>
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

            <Campo label="Año" htmlFor="anio" error={errors.anio?.message}>
              <Input id="anio" inputMode="numeric" {...register('anio')} />
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
              {isPending ? 'Guardando…' : 'Crear y abrir ficha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
