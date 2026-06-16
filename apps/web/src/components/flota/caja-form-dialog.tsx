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
import type { Caja } from './types';

const schema = z.object({
  placas: textoRequerido('Las placas son obligatorias'),
  tipo: seleccionRequerida('Selecciona el tipo de caja'),
  marca: z.string().trim().optional(),
  anio: numeroOpcional({ min: 1950, max: 2100, entero: true }),
  capacidadKg: numeroOpcional({ min: 0 }),
  capacidadM3: numeroOpcional({ min: 0 }),
  aseguradora: z.string().trim().optional(),
  numeroPoliza: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDefaults(caja?: Caja | null): FormValues {
  return {
    placas: caja?.placas ?? '',
    tipo: caja?.tipo ?? '',
    marca: caja?.marca ?? '',
    anio: caja?.anio != null ? String(caja.anio) : '',
    capacidadKg: caja?.capacidadKg != null ? String(caja.capacidadKg) : '',
    capacidadM3: caja?.capacidadM3 != null ? String(caja.capacidadM3) : '',
    aseguradora: caja?.aseguradora ?? '',
    numeroPoliza: caja?.numeroPoliza ?? '',
  };
}

function toPayload(values: FormValues) {
  return {
    placas: values.placas,
    tipo: values.tipo,
    marca: values.marca || undefined,
    anio: values.anio ? Number(values.anio) : undefined,
    capacidadKg: values.capacidadKg ? Number(values.capacidadKg) : undefined,
    capacidadM3: values.capacidadM3 ? Number(values.capacidadM3) : undefined,
    aseguradora: values.aseguradora || undefined,
    numeroPoliza: values.numeroPoliza || undefined,
  };
}

export function CajaFormDialog({
  caja,
  open: openProp,
  onOpenChange,
}: {
  caja?: Caja | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, setOpen, form, editando, submit, isPending } = useEntityFormDialog<
    FormValues,
    Caja
  >({
    schema,
    entity: caja,
    open: openProp,
    onOpenChange,
    toDefaults,
    toPayload,
    endpoint: '/cajas',
    invalidateKeys: [['cajas'], ['catalogo', 'cajas']],
    mensajes: { creado: 'Caja creada', actualizado: 'Caja actualizada' },
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
          <DialogTitle>{editando ? 'Editar caja' : 'Nueva caja'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Modifica los datos de la caja / remolque.'
              : 'Registra una nueva caja / remolque de la flotilla.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <CamposGrid cols={2}>
            <Campo label="Placas" htmlFor="placas" required error={errors.placas?.message}>
              <Input id="placas" autoFocus {...register('placas')} />
            </Campo>

            <Campo label="Tipo" required error={errors.tipo?.message}>
              <CatalogoSelect
                grupo="TIPO_CAJA"
                value={watch('tipo')}
                onChange={(c) => setValue('tipo', c, { shouldValidate: true })}
                placeholder="Selecciona el tipo"
                ariaLabel="Tipo de caja"
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

            <Campo label="Año" htmlFor="anio" error={errors.anio?.message}>
              <Input id="anio" inputMode="numeric" {...register('anio')} />
            </Campo>

            <Campo label="Capacidad (kg)" htmlFor="capacidadKg" error={errors.capacidadKg?.message}>
              <Input id="capacidadKg" inputMode="numeric" {...register('capacidadKg')} />
            </Campo>

            <Campo label="Capacidad (m³)" htmlFor="capacidadM3" error={errors.capacidadM3?.message}>
              <Input id="capacidadM3" inputMode="numeric" {...register('capacidadM3')} />
            </Campo>

            <Campo label="Aseguradora" error={errors.aseguradora?.message}>
              <CatalogoSelect
                grupo="ASEGURADORA"
                value={watch('aseguradora') ?? ''}
                onChange={(c) => setValue('aseguradora', c, { shouldValidate: true })}
                placeholder="Selecciona…"
                ariaLabel="Aseguradora"
              />
            </Campo>

            <Campo label="Número de póliza" htmlFor="numeroPoliza" error={errors.numeroPoliza?.message}>
              <Input id="numeroPoliza" {...register('numeroPoliza')} />
            </Campo>
          </CamposGrid>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear caja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
