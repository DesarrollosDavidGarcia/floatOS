'use client';

import { useState } from 'react';
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
import type { Unidad } from './types';

const schema = z.object({
  placas: z.string().trim().min(1, 'Las placas son obligatorias'),
  tipo: z.string().trim().min(1, 'El tipo es obligatorio'),
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  anio: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= 2100), {
      message: 'Año inválido',
    }),
  capacidadKg: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: 'Capacidad inválida',
    }),
  aseguradora: z.string().trim().optional(),
  numeroPoliza: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDefaults(unidad?: Unidad | null): FormValues {
  return {
    placas: unidad?.placas ?? '',
    tipo: unidad?.tipo ?? '',
    marca: unidad?.marca ?? '',
    modelo: unidad?.modelo ?? '',
    anio: unidad?.anio != null ? String(unidad.anio) : '',
    capacidadKg: unidad?.capacidadKg != null ? String(unidad.capacidadKg) : '',
    aseguradora: unidad?.aseguradora ?? '',
    numeroPoliza: unidad?.numeroPoliza ?? '',
  };
}

export function UnidadFormDialog({
  unidad,
  open,
  onOpenChange,
}: {
  unidad?: Unidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editando = Boolean(unidad);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(unidad),
  });

  // Reinicia el formulario cuando cambia la unidad o se abre el diálogo.
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = `${open}-${unidad?.id ?? 'nueva'}`;
  if (open && key !== lastKey) {
    setLastKey(key);
    reset(toDefaults(unidad));
  }

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        placas: values.placas,
        tipo: values.tipo,
        marca: values.marca || undefined,
        modelo: values.modelo || undefined,
        anio: values.anio ? Number(values.anio) : undefined,
        capacidadKg: values.capacidadKg ? Number(values.capacidadKg) : undefined,
        aseguradora: values.aseguradora || undefined,
        numeroPoliza: values.numeroPoliza || undefined,
      };
      if (editando && unidad) {
        const { data } = await api.patch<Unidad>(`/unidades/${unidad.id}`, payload);
        return data;
      }
      const { data } = await api.post<Unidad>('/unidades', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success(editando ? 'Unidad actualizada' : 'Unidad creada');
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar unidad' : 'Nueva unidad'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Modifica los datos de la unidad.'
              : 'Registra una nueva unidad de la flotilla.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="placas">Placas *</Label>
              <Input id="placas" {...register('placas')} />
              {errors.placas && (
                <p className="text-sm text-destructive">{errors.placas.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Input id="tipo" placeholder="Tractocamión, caja seca…" {...register('tipo')} />
              {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" {...register('marca')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" {...register('modelo')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="anio">Año</Label>
              <Input id="anio" inputMode="numeric" {...register('anio')} />
              {errors.anio && <p className="text-sm text-destructive">{errors.anio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacidadKg">Capacidad (kg)</Label>
              <Input id="capacidadKg" inputMode="numeric" {...register('capacidadKg')} />
              {errors.capacidadKg && (
                <p className="text-sm text-destructive">{errors.capacidadKg.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aseguradora">Aseguradora</Label>
              <Input id="aseguradora" {...register('aseguradora')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numeroPoliza">Número de póliza</Label>
              <Input id="numeroPoliza" {...register('numeroPoliza')} />
            </div>
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
              {mutation.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear unidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
