'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
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
import { useConductoresCatalogo, useUnidadesCatalogo } from './catalogos';

const NINGUNO = '__ninguno__';

export function AsignarDialog({
  viajeId,
  unidadIdActual,
  conductorIdActual,
}: {
  viajeId: string;
  unidadIdActual?: string | null;
  conductorIdActual?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [unidadId, setUnidadId] = useState<string>(unidadIdActual ?? NINGUNO);
  const [conductorId, setConductorId] = useState<string>(conductorIdActual ?? NINGUNO);
  const qc = useQueryClient();

  const unidades = useUnidadesCatalogo();
  const conductores = useConductoresCatalogo();

  useEffect(() => {
    if (open) {
      setUnidadId(unidadIdActual ?? NINGUNO);
      setConductorId(conductorIdActual ?? NINGUNO);
    }
  }, [open, unidadIdActual, conductorIdActual]);

  const mutar = useMutation({
    mutationFn: async () => {
      const body: { unidadId?: string | null; conductorId?: string | null } = {
        unidadId: unidadId === NINGUNO ? null : unidadId,
        conductorId: conductorId === NINGUNO ? null : conductorId,
      };
      const { data } = await api.patch(`/viajes/${viajeId}/asignar`, body);
      return data;
    },
    onSuccess: () => {
      toast.success('Asignación actualizada');
      invalidarViajes(qc, viajeId);
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const tieneAsignacion = Boolean(unidadIdActual || conductorIdActual);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCog />
          {tieneAsignacion ? 'Reasignar' : 'Asignar'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar unidad y conductor</DialogTitle>
          <DialogDescription>Selecciona la unidad y/o el conductor del viaje.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="asignar-unidad">Unidad</Label>
            <Select value={unidadId} onValueChange={setUnidadId}>
              <SelectTrigger id="asignar-unidad">
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
            <Label htmlFor="asignar-conductor">Conductor</Label>
            <Select value={conductorId} onValueChange={setConductorId}>
              <SelectTrigger id="asignar-conductor">
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutar.mutate()} disabled={mutar.isPending}>
            {mutar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
