'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
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

export function EnviarCotizacionDialog({
  cotizacionId,
  folio,
  viajeId,
}: {
  cotizacionId: string;
  folio: number;
  viajeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const qc = useQueryClient();

  const mutar = useMutation({
    mutationFn: async () =>
      (
        await api.post(
          `/cotizaciones/${cotizacionId}/enviar`,
          to.trim() ? { to: to.trim() } : {},
        )
      ).data,
    onSuccess: () => {
      toast.success('Cotización enviada');
      qc.invalidateQueries({ queryKey: ['cotizaciones', viajeId] });
      invalidarViajes(qc, viajeId);
      setOpen(false);
      setTo('');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send />
          Enviar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar cotización #{folio}</DialogTitle>
          <DialogDescription>
            Se enviará el PDF por correo. Si dejas el campo vacío, se usa el correo
            de contacto del cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="to">Correo destino (opcional)</Label>
          <Input
            id="to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="cliente@correo.com"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutar.mutate()} disabled={mutar.isPending}>
            {mutar.isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
