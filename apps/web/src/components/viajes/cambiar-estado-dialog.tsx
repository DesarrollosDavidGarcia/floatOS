'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft } from 'lucide-react';
import { EstadoViaje, TRANSICIONES_VIAJE } from '@flotaos/shared-types';
import { ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CambiarEstadoDialog({
  viajeId,
  estadoActual,
}: {
  viajeId: string;
  estadoActual: EstadoViaje;
}) {
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState<string>('');
  const [nota, setNota] = useState('');
  const qc = useQueryClient();

  const opciones = TRANSICIONES_VIAJE[estadoActual] ?? [];

  const mutar = useMutation({
    mutationFn: async () => {
      const body: { estado: string; nota?: string } = { estado: destino };
      if (nota.trim()) body.nota = nota.trim();
      const { data } = await api.patch(`/viajes/${viajeId}/estado`, body);
      return data;
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      invalidarViajes(qc, viajeId);
      setOpen(false);
      setDestino('');
      setNota('');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDestino('');
      setNota('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={opciones.length === 0}>
          <ArrowRightLeft />
          Cambiar estado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado del viaje</DialogTitle>
          <DialogDescription>
            Estado actual: {ESTADO_VIAJE_LABEL[estadoActual]}
          </DialogDescription>
        </DialogHeader>

        {opciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay transiciones disponibles desde este estado.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="destino">Nuevo estado</Label>
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger id="destino">
                  <SelectValue placeholder="Selecciona el nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_VIAJE_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nota">Nota (opcional)</Label>
              <Input
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Comentario del cambio"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutar.mutate()} disabled={!destino || mutar.isPending}>
            {mutar.isPending ? 'Guardando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
