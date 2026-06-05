'use client';

import { type ReactNode } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { textoRequerido } from '@/lib/validacion';
import { useEntityFormDialog } from '@/lib/use-entity-form-dialog';
import type { Cliente } from '@/app/(panel)/clientes/tipos';

const schema = z.object({
  razonSocial: textoRequerido('La razón social es obligatoria').max(200, 'Máximo 200 caracteres'),
  rfc: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[A-ZÑ&0-9]{12,13}$/i.test(v),
      'El RFC debe tener 12 o 13 caracteres',
    ),
  contactoNombre: z.string().trim().optional().or(z.literal('')),
  contactoTelefono: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\d{10}$/.test(v.replace(/\D/g, '')),
      'El teléfono debe tener 10 dígitos',
    ),
  contactoEmail: z.string().trim().email('Correo inválido').optional().or(z.literal('')),
  direccion: z.string().trim().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const VACIO: FormValues = {
  razonSocial: '',
  rfc: '',
  contactoNombre: '',
  contactoTelefono: '',
  contactoEmail: '',
  direccion: '',
};

/** Convierte cadenas vacías en undefined para no mandar campos vacíos. */
function limpiar(values: FormValues) {
  const out: Record<string, string> = { razonSocial: values.razonSocial.trim() };
  const opcionales: (keyof FormValues)[] = [
    'rfc',
    'contactoNombre',
    'contactoTelefono',
    'contactoEmail',
    'direccion',
  ];
  for (const key of opcionales) {
    const val = (values[key] ?? '').trim();
    if (val) out[key] = val;
  }
  return out;
}

export function ClienteFormDialog({
  trigger,
  cliente,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  cliente?: Cliente | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { open, setOpen, form, editando, submit, isPending } = useEntityFormDialog<
    FormValues,
    Cliente
  >({
    schema,
    entity: cliente,
    open: openProp,
    onOpenChange,
    toDefaults: (c) =>
      c
        ? {
            razonSocial: c.razonSocial ?? '',
            rfc: c.rfc ?? '',
            contactoNombre: c.contactoNombre ?? '',
            contactoTelefono: c.contactoTelefono ?? '',
            contactoEmail: c.contactoEmail ?? '',
            direccion: c.direccion ?? '',
          }
        : VACIO,
    toPayload: limpiar,
    endpoint: '/clientes',
    invalidateKeys: [['clientes']],
    mensajes: { creado: 'Cliente creado', actualizado: 'Cliente actualizado' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <span onClick={() => setOpen(true)}>{trigger}</span> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Actualiza los datos del cliente.'
              : 'Registra un nuevo cliente para asignarle viajes.'}
          </DialogDescription>
        </DialogHeader>

        <form id="cliente-form" onSubmit={submit} className="space-y-3">
          <CamposGrid cols={2}>
            <Campo
              label="Razón social"
              htmlFor="razonSocial"
              required
              error={errors.razonSocial?.message}
              full
            >
              <Input id="razonSocial" {...register('razonSocial')} autoFocus />
            </Campo>

            <Campo label="RFC" htmlFor="rfc" error={errors.rfc?.message}>
              <Input id="rfc" {...register('rfc')} />
            </Campo>

            <Campo
              label="Nombre de contacto"
              htmlFor="contactoNombre"
              error={errors.contactoNombre?.message}
            >
              <Input id="contactoNombre" {...register('contactoNombre')} />
            </Campo>

            <Campo label="Teléfono" htmlFor="contactoTelefono" error={errors.contactoTelefono?.message}>
              <Input id="contactoTelefono" {...register('contactoTelefono')} />
            </Campo>

            <Campo label="Correo" htmlFor="contactoEmail" error={errors.contactoEmail?.message}>
              <Input id="contactoEmail" type="email" {...register('contactoEmail')} />
            </Campo>

            <Campo label="Dirección" htmlFor="direccion" error={errors.direccion?.message} full>
              <Input id="direccion" {...register('direccion')} />
            </Campo>
          </CamposGrid>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="cliente-form" disabled={isPending}>
            {isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
