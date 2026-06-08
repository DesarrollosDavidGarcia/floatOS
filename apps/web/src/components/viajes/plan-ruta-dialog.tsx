'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import type { Viaje } from './types';
import {
  PLAN_RUTA_DEFAULT,
  formatearDuracion,
  planificarRuta,
  sanearPlan,
  type PlanRutaParams,
} from './plan-ruta';

const CAMPOS: Array<{
  key: keyof PlanRutaParams;
  label: string;
  hint: string;
  min: number;
  max: number;
}> = [
  { key: 'horasConduccionDia', label: 'Horas de conducción / día', hint: 'Tope efectivo al volante', min: 1, max: 24 },
  { key: 'horasDescanso', label: 'Descanso entre días (h)', hint: 'Pernocta mínima', min: 0, max: 24 },
  { key: 'minutosPorEscala', label: 'Tiempo por escala (min)', hint: 'Carga / descarga', min: 0, max: 600 },
  { key: 'horaInicio', label: 'Hora de inicio diaria', hint: '0–23, hora local', min: 0, max: 23 },
];

export function PlanRutaDialog({ viaje }: { viaje: Viaje }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanRutaParams>(
    sanearPlan(viaje.planRuta ?? PLAN_RUTA_DEFAULT),
  );
  const qc = useQueryClient();

  // Previsualización en vivo de la llegada con los valores actuales del formulario.
  const salida = viaje.fechaProgramada ? new Date(viaje.fechaProgramada) : null;
  const conduccion = viaje.tiempoEstimadoMin ?? null;
  const preview =
    salida && conduccion != null && !Number.isNaN(salida.getTime())
      ? planificarRuta(salida, conduccion, viaje.escalas?.length ?? 0, plan)
      : null;

  const mutar = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/viajes/${viaje.id}/plan-ruta`, sanearPlan(plan));
      return data;
    },
    onSuccess: () => {
      toast.success('Plan de viaje guardado');
      invalidarViajes(qc, viaje.id);
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setPlan(sanearPlan(viaje.planRuta ?? PLAN_RUTA_DEFAULT));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock />
          Ajustar plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan de viaje</DialogTitle>
          <DialogDescription>
            Define la jornada del conductor para estimar la fecha de llegada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {CAMPOS.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label htmlFor={c.key}>{c.label}</Label>
              <Input
                id={c.key}
                type="number"
                min={c.min}
                max={c.max}
                value={plan[c.key]}
                onChange={(e) =>
                  setPlan((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">{c.hint}</p>
            </div>
          ))}
        </div>

        {preview ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">
              Llegada estimada:{' '}
              {format(preview.llegada, "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
            <p className="text-xs text-muted-foreground">
              {preview.diasConduccion} día(s) de conducción · Total{' '}
              {formatearDuracion(preview.totalMin)} (conducción{' '}
              {formatearDuracion(preview.conduccionMin)} · descansos{' '}
              {formatearDuracion(preview.descansoMin)} · escalas{' '}
              {formatearDuracion(preview.servicioMin)})
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Asigna una fecha programada y calcula la ruta por carretera para ver la
            llegada estimada.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutar.mutate()} disabled={mutar.isPending}>
            {mutar.isPending ? 'Guardando…' : 'Guardar plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
