'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useClientesCatalogo,
  useConductoresCatalogo,
  useUnidadesCatalogo,
} from './catalogos';
import type { CrearViajePayload, Viaje } from './types';

const NINGUNO = '__ninguno__';

const schema = z.object({
  clienteId: z.string().min(1, 'Selecciona un cliente'),
  origenDireccion: z.string().min(1, 'Requerido'),
  destinoDireccion: z.string().min(1, 'Requerido'),
  tipoCarga: z.string().min(1, 'Requerido'),
  descripcionCarga: z.string().optional(),
  pesoKg: z.string().optional(),
  dimensiones: z.string().optional(),
  fechaProgramada: z.string().optional(),
  unidadId: z.string().optional(),
  conductorId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CrearViajeDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const clientes = useClientesCatalogo();
  const unidades = useUnidadesCatalogo();
  const conductores = useConductoresCatalogo();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clienteId: '',
      origenDireccion: '',
      destinoDireccion: '',
      tipoCarga: '',
      descripcionCarga: '',
      pesoKg: '',
      dimensiones: '',
      fechaProgramada: '',
      unidadId: NINGUNO,
      conductorId: NINGUNO,
    },
  });

  const crear = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: CrearViajePayload = {
        clienteId: values.clienteId,
        origenDireccion: values.origenDireccion.trim(),
        destinoDireccion: values.destinoDireccion.trim(),
        tipoCarga: values.tipoCarga.trim(),
      };
      if (values.descripcionCarga?.trim()) payload.descripcionCarga = values.descripcionCarga.trim();
      if (values.dimensiones?.trim()) payload.dimensiones = values.dimensiones.trim();
      if (values.pesoKg?.trim()) {
        const n = Number(values.pesoKg);
        if (!Number.isNaN(n)) payload.pesoKg = n;
      }
      if (values.fechaProgramada) {
        payload.fechaProgramada = new Date(values.fechaProgramada).toISOString();
      }
      if (values.unidadId && values.unidadId !== NINGUNO) payload.unidadId = values.unidadId;
      if (values.conductorId && values.conductorId !== NINGUNO) payload.conductorId = values.conductorId;

      const { data } = await api.post<Viaje>('/viajes', payload);
      return data;
    },
    onSuccess: (viaje) => {
      toast.success(`Viaje ${viaje.folio ?? ''} creado`);
      qc.invalidateQueries({ queryKey: ['viajes'] });
      setOpen(false);
      reset();
      router.push(`/viajes/${viaje.id}`);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const clienteId = watch('clienteId');
  const unidadId = watch('unidadId');
  const conductorId = watch('conductorId');

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo viaje
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo viaje</DialogTitle>
          <DialogDescription>Registra un viaje y, opcionalmente, asígnalo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => crear.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clienteId">Cliente *</Label>
            <Select value={clienteId} onValueChange={(v) => setValue('clienteId', v, { shouldValidate: true })}>
              <SelectTrigger id="clienteId">
                <SelectValue placeholder={clientes.isLoading ? 'Cargando…' : 'Selecciona un cliente'} />
              </SelectTrigger>
              <SelectContent>
                {(clientes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clienteId && <p className="text-sm text-destructive">{errors.clienteId.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="origenDireccion">Origen *</Label>
              <Input id="origenDireccion" {...register('origenDireccion')} />
              {errors.origenDireccion && (
                <p className="text-sm text-destructive">{errors.origenDireccion.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destinoDireccion">Destino *</Label>
              <Input id="destinoDireccion" {...register('destinoDireccion')} />
              {errors.destinoDireccion && (
                <p className="text-sm text-destructive">{errors.destinoDireccion.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipoCarga">Tipo de carga *</Label>
              <Input id="tipoCarga" {...register('tipoCarga')} />
              {errors.tipoCarga && <p className="text-sm text-destructive">{errors.tipoCarga.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pesoKg">Peso (kg)</Label>
              <Input id="pesoKg" type="number" step="any" min="0" {...register('pesoKg')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcionCarga">Descripción de la carga</Label>
            <Input id="descripcionCarga" {...register('descripcionCarga')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dimensiones">Dimensiones</Label>
              <Input id="dimensiones" placeholder="Ej. 2x2x4 m" {...register('dimensiones')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fechaProgramada">Fecha programada</Label>
              <Input id="fechaProgramada" type="datetime-local" {...register('fechaProgramada')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="unidadId">Unidad</Label>
              <Select
                value={unidadId}
                onValueChange={(v) => setValue('unidadId', v)}
              >
                <SelectTrigger id="unidadId">
                  <SelectValue placeholder={unidades.isLoading ? 'Cargando…' : 'Sin asignar'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                  {(unidades.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conductorId">Conductor</Label>
              <Select
                value={conductorId}
                onValueChange={(v) => setValue('conductorId', v)}
              >
                <SelectTrigger id="conductorId">
                  <SelectValue placeholder={conductores.isLoading ? 'Cargando…' : 'Sin asignar'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                  {(conductores.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={crear.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear viaje'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
