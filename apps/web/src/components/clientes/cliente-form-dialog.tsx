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
import { Label } from '@/components/ui/label';
import type { Cliente } from '@/app/(panel)/clientes/tipos';

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .or(z.literal(''));

const schema = z.object({
  razonSocial: z
    .string()
    .trim()
    .min(1, 'La razón social es requerida')
    .max(200, 'Máximo 200 caracteres'),
  rfc: opcional(20),
  contactoNombre: opcional(120),
  contactoTelefono: opcional(40),
  contactoEmail: z
    .string()
    .trim()
    .email('Correo no válido')
    .optional()
    .or(z.literal('')),
  direccion: opcional(300),
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
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="razonSocial">Razón social *</Label>
            <Input id="razonSocial" {...register('razonSocial')} autoFocus />
            {errors.razonSocial ? (
              <p className="text-sm text-destructive">{errors.razonSocial.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rfc">RFC</Label>
              <Input id="rfc" {...register('rfc')} />
              {errors.rfc ? (
                <p className="text-sm text-destructive">{errors.rfc.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactoNombre">Nombre de contacto</Label>
              <Input id="contactoNombre" {...register('contactoNombre')} />
              {errors.contactoNombre ? (
                <p className="text-sm text-destructive">{errors.contactoNombre.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contactoTelefono">Teléfono</Label>
              <Input id="contactoTelefono" {...register('contactoTelefono')} />
              {errors.contactoTelefono ? (
                <p className="text-sm text-destructive">{errors.contactoTelefono.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactoEmail">Correo</Label>
              <Input id="contactoEmail" type="email" {...register('contactoEmail')} />
              {errors.contactoEmail ? (
                <p className="text-sm text-destructive">{errors.contactoEmail.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" {...register('direccion')} />
            {errors.direccion ? (
              <p className="text-sm text-destructive">{errors.direccion.message}</p>
            ) : null}
          </div>
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
