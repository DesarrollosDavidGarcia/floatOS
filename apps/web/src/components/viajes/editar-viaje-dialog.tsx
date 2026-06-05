'use client';

import { z } from 'zod';
import { Pencil } from 'lucide-react';
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
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { textoRequerido, numeroOpcional } from '@/lib/validacion';
import { useEntityFormDialog } from '@/lib/use-entity-form-dialog';
import type { Viaje } from './types';

const schema = z.object({
  origenDireccion: textoRequerido('El origen es obligatorio'),
  destinoDireccion: textoRequerido('El destino es obligatorio'),
  tipoCarga: textoRequerido('El tipo de carga es obligatorio'),
  descripcionCarga: z.string().optional(),
  pesoKg: numeroOpcional({ min: 0 }),
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

function toPayload(values: FormValues) {
  return {
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
}

export function EditarViajeDialog({ viaje }: { viaje: Viaje }) {
  const { open, setOpen, form, submit, isPending } = useEntityFormDialog<FormValues, Viaje>({
    schema,
    entity: viaje,
    toDefaults: (v) => ({
      origenDireccion: v?.origenDireccion ?? '',
      destinoDireccion: v?.destinoDireccion ?? '',
      tipoCarga: v?.tipoCarga ?? '',
      descripcionCarga: v?.descripcionCarga ?? '',
      pesoKg: v?.pesoKg != null ? String(v.pesoKg) : '',
      dimensiones: v?.dimensiones ?? '',
      fechaProgramada: aLocalInput(v?.fechaProgramada),
    }),
    toPayload,
    endpoint: '/viajes',
    // Refresca listado + detalle + dashboard + tracking (conteos/posiciones).
    invalidateKeys: [['viaje', viaje.id], ['viajes'], ['dashboard'], ['tracking']],
    mensajes: { creado: 'Viaje actualizado', actualizado: 'Viaje actualizado' },
  });
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar viaje</DialogTitle>
          <DialogDescription>Actualiza los datos generales del viaje.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Origen / Destino */}
          <CamposGrid cols={2}>
            <Campo
              label="Origen"
              htmlFor="edit-origen"
              required
              error={errors.origenDireccion?.message}
              full
            >
              <Input id="edit-origen" {...register('origenDireccion')} />
            </Campo>
            <Campo
              label="Destino"
              htmlFor="edit-destino"
              required
              error={errors.destinoDireccion?.message}
              full
            >
              <Input id="edit-destino" {...register('destinoDireccion')} />
            </Campo>
          </CamposGrid>

          {/* Tipo de carga / Peso */}
          <CamposGrid cols={2}>
            <Campo
              label="Tipo de carga"
              htmlFor="edit-tipoCarga"
              required
              error={errors.tipoCarga?.message}
            >
              <Input id="edit-tipoCarga" {...register('tipoCarga')} />
            </Campo>
            <Campo label="Peso (kg)" htmlFor="edit-pesoKg" error={errors.pesoKg?.message}>
              <Input id="edit-pesoKg" type="number" step="any" min="0" {...register('pesoKg')} />
            </Campo>
          </CamposGrid>

          {/* Descripción */}
          <CamposGrid cols={2}>
            <Campo label="Descripción de la carga" htmlFor="edit-descripcion" full>
              <Input id="edit-descripcion" {...register('descripcionCarga')} />
            </Campo>
          </CamposGrid>

          {/* Dimensiones / Fecha */}
          <CamposGrid cols={2}>
            <Campo label="Dimensiones" htmlFor="edit-dimensiones">
              <Input id="edit-dimensiones" {...register('dimensiones')} />
            </Campo>
            <Campo label="Fecha programada" htmlFor="edit-fecha">
              <Input id="edit-fecha" type="datetime-local" {...register('fechaProgramada')} />
            </Campo>
          </CamposGrid>

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
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
