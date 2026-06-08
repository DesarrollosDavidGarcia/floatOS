'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, X } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [correos, setCorreos] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState('');
  const qc = useQueryClient();

  function agregar() {
    const email = nuevo.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      toast.error('Correo inválido');
      return;
    }
    if (!correos.includes(email)) setCorreos((c) => [...c, email]);
    setNuevo('');
  }

  function quitar(email: string) {
    setCorreos((c) => c.filter((x) => x !== email));
  }

  const enviar = useMutation({
    mutationFn: async () =>
      (await api.post(`/cotizaciones/${cotizacionId}/enviar`, { to: correos })).data,
    onSuccess: () => {
      toast.success('Cotización enviada');
      qc.invalidateQueries({ queryKey: ['cotizaciones', viajeId] });
      invalidarViajes(qc, viajeId);
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCorreos([]);
      setNuevo('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            Agrega uno o varios correos. Si no agregas ninguno, se usa el correo de
            contacto del cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="to">Correos destino</Label>
          <div className="flex gap-2">
            <Input
              id="to"
              type="email"
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregar();
                }
              }}
              placeholder="cliente@correo.com"
            />
            <Button type="button" variant="outline" onClick={agregar} disabled={!nuevo.trim()}>
              <Plus />
              Agregar
            </Button>
          </div>
          {correos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {correos.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => quitar(email)}
                    className="ml-0.5 rounded-sm hover:text-destructive"
                    aria-label={`Quitar ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => enviar.mutate()} disabled={enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
