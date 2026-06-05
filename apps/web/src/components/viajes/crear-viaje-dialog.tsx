'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { textoRequerido, seleccionRequerida, numeroOpcional } from '@/lib/validacion';
import {
  useClientesCatalogo,
  useConductoresCatalogo,
  useUnidadesCatalogo,
} from './catalogos';
import type { CrearViajePayload, Viaje } from './types';

const NINGUNO = '__ninguno__';

const schema = z.object({
  clienteId: seleccionRequerida('Selecciona un cliente'),
  origenDireccion: textoRequerido('El origen es obligatorio'),
  destinoDireccion: textoRequerido('El destino es obligatorio'),
  tipoCarga: textoRequerido('El tipo de carga es obligatorio'),
  descripcionCarga: z.string().optional(),
  pesoKg: numeroOpcional({ min: 0 }),
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
    mode: 'onTouched',
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
      invalidarViajes(qc);
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
          {/* Cliente */}
          <CamposGrid cols={2}>
            <Campo
              label="Cliente"
              htmlFor="clienteId"
              required
              error={errors.clienteId?.message}
              full
            >
              <Select
                value={clienteId}
                onValueChange={(v) => setValue('clienteId', v, { shouldValidate: true })}
              >
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
            </Campo>
          </CamposGrid>

          {/* Origen / Destino */}
          <CamposGrid cols={2}>
            <Campo
              label="Origen"
              htmlFor="origenDireccion"
              required
              error={errors.origenDireccion?.message}
              full
            >
              <Input id="origenDireccion" {...register('origenDireccion')} />
            </Campo>
            <Campo
              label="Destino"
              htmlFor="destinoDireccion"
              required
              error={errors.destinoDireccion?.message}
              full
            >
              <Input id="destinoDireccion" {...register('destinoDireccion')} />
            </Campo>
          </CamposGrid>

          {/* Tipo de carga / Peso */}
          <CamposGrid cols={2}>
            <Campo
              label="Tipo de carga"
              htmlFor="tipoCarga"
              required
              error={errors.tipoCarga?.message}
            >
              <Input id="tipoCarga" {...register('tipoCarga')} />
            </Campo>
            <Campo
              label="Peso (kg)"
              htmlFor="pesoKg"
              error={errors.pesoKg?.message}
            >
              <Input id="pesoKg" type="number" step="any" min="0" {...register('pesoKg')} />
            </Campo>
          </CamposGrid>

          {/* Descripción */}
          <CamposGrid cols={2}>
            <Campo
              label="Descripción de la carga"
              htmlFor="descripcionCarga"
              full
            >
              <Input id="descripcionCarga" {...register('descripcionCarga')} />
            </Campo>
          </CamposGrid>

          {/* Dimensiones / Fecha */}
          <CamposGrid cols={2}>
            <Campo label="Dimensiones" htmlFor="dimensiones">
              <Input id="dimensiones" placeholder="Ej. 2x2x4 m" {...register('dimensiones')} />
            </Campo>
            <Campo label="Fecha programada" htmlFor="fechaProgramada">
              <Input id="fechaProgramada" type="datetime-local" {...register('fechaProgramada')} />
            </Campo>
          </CamposGrid>

          {/* Unidad / Conductor */}
          <CamposGrid cols={2}>
            <Campo label="Unidad" htmlFor="unidadId">
              <Select
                value={unidadId}
                onValueChange={(v) => setValue('unidadId', v, { shouldValidate: true })}
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
            </Campo>
            <Campo label="Conductor" htmlFor="conductorId">
              <Select
                value={conductorId}
                onValueChange={(v) => setValue('conductorId', v, { shouldValidate: true })}
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
            </Campo>
          </CamposGrid>

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
