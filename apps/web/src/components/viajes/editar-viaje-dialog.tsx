'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Viaje } from './types';

const schema = z.object({
  origenDireccion: z.string().min(1, 'Requerido'),
  destinoDireccion: z.string().min(1, 'Requerido'),
  tipoCarga: z.string().min(1, 'Requerido'),
  descripcionCarga: z.string().optional(),
  pesoKg: z.string().optional(),
  dimensiones: z.string().optional(),
  fechaProgramada: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/** Convierte una fecha ISO a formato datetime-local (sin segundos). */
function aLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditarViajeDialog({ viaje }: { viaje: Viaje }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        origenDireccion: viaje.origenDireccion,
        destinoDireccion: viaje.destinoDireccion,
        tipoCarga: viaje.tipoCarga,
        descripcionCarga: viaje.descripcionCarga ?? '',
        pesoKg: viaje.pesoKg != null ? String(viaje.pesoKg) : '',
        dimensiones: viaje.dimensiones ?? '',
        fechaProgramada: aLocalInput(viaje.fechaProgramada),
      });
    }
  }, [open, viaje, reset]);

  const mutar = useMutation({
    mutationFn: async (values: FormValues) => {
      const body: Record<string, unknown> = {
        origenDireccion: values.origenDireccion.trim(),
        destinoDireccion: values.destinoDireccion.trim(),
        tipoCarga: values.tipoCarga.trim(),
        descripcionCarga: values.descripcionCarga?.trim() || null,
        dimensiones: values.dimensiones?.trim() || null,
        pesoKg: values.pesoKg?.trim() ? Number(values.pesoKg) : null,
        fechaProgramada: values.fechaProgramada
          ? new Date(values.fechaProgramada).toISOString()
          : null,
      };
      const { data } = await api.patch(`/viajes/${viaje.id}`, body);
      return data;
    },
    onSuccess: () => {
      toast.success('Viaje actualizado');
      qc.invalidateQueries({ queryKey: ['viaje', viaje.id] });
      qc.invalidateQueries({ queryKey: ['viajes'] });
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar viaje</DialogTitle>
          <DialogDescription>Actualiza los datos generales del viaje.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutar.mutate(v))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-origen">Origen *</Label>
              <Input id="edit-origen" {...register('origenDireccion')} />
              {errors.origenDireccion && (
                <p className="text-sm text-destructive">{errors.origenDireccion.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-destino">Destino *</Label>
              <Input id="edit-destino" {...register('destinoDireccion')} />
              {errors.destinoDireccion && (
                <p className="text-sm text-destructive">{errors.destinoDireccion.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-tipoCarga">Tipo de carga *</Label>
              <Input id="edit-tipoCarga" {...register('tipoCarga')} />
              {errors.tipoCarga && (
                <p className="text-sm text-destructive">{errors.tipoCarga.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pesoKg">Peso (kg)</Label>
              <Input id="edit-pesoKg" type="number" step="any" min="0" {...register('pesoKg')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-descripcion">Descripción de la carga</Label>
            <Input id="edit-descripcion" {...register('descripcionCarga')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-dimensiones">Dimensiones</Label>
              <Input id="edit-dimensiones" {...register('dimensiones')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fecha">Fecha programada</Label>
              <Input id="edit-fecha" type="datetime-local" {...register('fechaProgramada')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutar.isPending}>
              {mutar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
