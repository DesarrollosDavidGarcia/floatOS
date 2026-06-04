'use client';

import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Conductor, ConductorFormPayload } from './types';

const baseSchema = {
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().trim().optional(),
  usuario: z.string().trim().min(1, 'El usuario es obligatorio'),
  email: z
    .string()
    .trim()
    .email('El email no es válido')
    .optional()
    .or(z.literal('')),
  telefono: z.string().trim().optional(),
};

function buildSchema(esEdicion: boolean) {
  return z.object({
    ...baseSchema,
    password: esEdicion
      ? z
          .string()
          .optional()
          .refine((v) => !v || v.length >= 6, 'La contraseña debe tener al menos 6 caracteres')
      : z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  });
}

type FormValues = {
  nombre: string;
  apellidos?: string;
  usuario: string;
  email?: string;
  telefono?: string;
  password?: string;
};

export function ConductorFormDialog({
  trigger,
  conductor,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  conductor?: Conductor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const esEdicion = Boolean(conductor);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(esEdicion)),
    defaultValues: {
      nombre: '',
      apellidos: '',
      usuario: '',
      email: '',
      telefono: '',
      password: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nombre: conductor?.nombre ?? '',
        apellidos: conductor?.apellidos ?? '',
        usuario: conductor?.usuario ?? '',
        email: conductor?.email ?? '',
        telefono: conductor?.telefono ?? '',
        password: '',
      });
    }
  }, [open, conductor, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: ConductorFormPayload = {
        nombre: values.nombre.trim(),
        usuario: values.usuario.trim(),
      };
      if (values.apellidos?.trim()) payload.apellidos = values.apellidos.trim();
      if (values.email?.trim()) payload.email = values.email.trim();
      if (values.telefono?.trim()) payload.telefono = values.telefono.trim();
      if (values.password) payload.password = values.password;

      if (esEdicion && conductor) {
        const { data } = await api.patch<Conductor>(`/conductores/${conductor.id}`, payload);
        return data;
      }
      const { data } = await api.post<Conductor>('/conductores', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductores'] });
      toast.success(esEdicion ? 'Conductor actualizado' : 'Conductor creado');
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar conductor' : 'Nuevo conductor'}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? 'Modifica los datos del conductor. Deja la contraseña vacía para no cambiarla.'
              : 'Registra un nuevo conductor en la flotilla.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...register('nombre')} />
              {errors.nombre && (
                <p className="text-sm text-destructive">{errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input id="apellidos" {...register('apellidos')} />
              {errors.apellidos && (
                <p className="text-sm text-destructive">{errors.apellidos.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usuario">Usuario</Label>
              <Input id="usuario" autoComplete="off" {...register('usuario')} />
              {errors.usuario && (
                <p className="text-sm text-destructive">{errors.usuario.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" {...register('telefono')} />
              {errors.telefono && (
                <p className="text-sm text-destructive">{errors.telefono.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {esEdicion && (
              <p className="text-xs text-muted-foreground">
                Dejar vacío para no cambiar.
              </p>
            )}
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
