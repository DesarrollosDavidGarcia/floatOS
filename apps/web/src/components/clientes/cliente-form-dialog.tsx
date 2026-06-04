'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
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
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const editando = Boolean(cliente);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VACIO,
    mode: 'onTouched',
  });

  // Rellena el formulario al abrir (crear -> vacío, editar -> datos).
  useEffect(() => {
    if (!open) return;
    if (cliente) {
      reset({
        razonSocial: cliente.razonSocial ?? '',
        rfc: cliente.rfc ?? '',
        contactoNombre: cliente.contactoNombre ?? '',
        contactoTelefono: cliente.contactoTelefono ?? '',
        contactoEmail: cliente.contactoEmail ?? '',
        direccion: cliente.direccion ?? '',
      });
    } else {
      reset(VACIO);
    }
  }, [open, cliente, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = limpiar(values);
      if (cliente) {
        const { data } = await api.patch<Cliente>(`/clientes/${cliente.id}`, payload);
        return data;
      }
      const { data } = await api.post<Cliente>('/clientes', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success(editando ? 'Cliente actualizado' : 'Cliente creado');
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

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

        <form
          id="cliente-form"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-3"
        >
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="cliente-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
