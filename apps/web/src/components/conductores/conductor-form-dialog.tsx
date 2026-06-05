'use client';

import { type ReactNode } from 'react';
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
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { useEntityFormDialog } from '@/lib/use-entity-form-dialog';
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

function toPayload(values: FormValues): ConductorFormPayload {
  const payload: ConductorFormPayload = {
    nombre: values.nombre.trim(),
    usuario: values.usuario.trim(),
  };
  if (values.apellidos?.trim()) payload.apellidos = values.apellidos.trim();
  if (values.email?.trim()) payload.email = values.email.trim();
  if (values.telefono?.trim()) payload.telefono = values.telefono.trim();
  if (values.password) payload.password = values.password;
  return payload;
}

export function ConductorFormDialog({
  trigger,
  conductor,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  conductor?: Conductor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, setOpen, form, editando, submit, isPending } = useEntityFormDialog<
    FormValues,
    Conductor
  >({
    schema: buildSchema(Boolean(conductor)),
    entity: conductor ?? null,
    open: openProp,
    onOpenChange,
    toDefaults: (c) => ({
      nombre: c?.nombre ?? '',
      apellidos: c?.apellidos ?? '',
      usuario: c?.usuario ?? '',
      email: c?.email ?? '',
      telefono: c?.telefono ?? '',
      password: '',
    }),
    toPayload,
    endpoint: '/conductores',
    invalidateKeys: [['conductores']],
    mensajes: { creado: 'Conductor creado', actualizado: 'Conductor actualizado' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar conductor' : 'Nuevo conductor'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Modifica los datos del conductor. Deja la contraseña vacía para no cambiarla.'
              : 'Registra un nuevo conductor en la flotilla.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <CamposGrid cols={2}>
            <Campo label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
              <Input id="nombre" {...register('nombre')} />
            </Campo>

            <Campo label="Apellidos" htmlFor="apellidos" error={errors.apellidos?.message}>
              <Input id="apellidos" {...register('apellidos')} />
            </Campo>

            <Campo label="Usuario" htmlFor="usuario" required error={errors.usuario?.message}>
              <Input id="usuario" autoComplete="off" {...register('usuario')} />
            </Campo>

            <Campo label="Teléfono" htmlFor="telefono" error={errors.telefono?.message}>
              <Input id="telefono" {...register('telefono')} />
            </Campo>

            <Campo label="Email" htmlFor="email" full error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
            </Campo>

            <Campo
              label="Contraseña"
              htmlFor="password"
              required={!editando}
              full
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
            </Campo>
          </CamposGrid>

          {editando && (
            <p className="text-xs text-muted-foreground">Dejar vacío para no cambiar.</p>
          )}

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
              {isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear conductor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
