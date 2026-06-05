'use client';

import { z } from 'zod';
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
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
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
  });
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
