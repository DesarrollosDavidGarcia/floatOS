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
import { Textarea } from '@/components/ui/textarea';
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

/** Input con chips de correos (validación + agregar/quitar), maneja su propio borrador. */
function ChipsCorreo({
  id,
  label,
  valores,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  valores: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [nuevo, setNuevo] = useState('');

  function agregar() {
    const email = nuevo.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      toast.error('Correo inválido');
      return;
    }
    if (!valores.includes(email)) onChange([...valores, email]);
    setNuevo('');
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="email"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder={placeholder ?? 'correo@dominio.com'}
        />
        <Button type="button" variant="outline" onClick={agregar} disabled={!nuevo.trim()}>
          <Plus />
          Agregar
        </Button>
      </div>
      {valores.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {valores.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1">
              {email}
              <button
                type="button"
                onClick={() => onChange(valores.filter((x) => x !== email))}
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
  );
}

export function EnviarCotizacionDialog({
  cotizacionId,
  folio,
  viajeId,
  clienteEmail,
}: {
  cotizacionId: string;
  folio: number;
  viajeId: string;
  clienteEmail?: string | null;
}) {
  const prefill = (): string[] => {
    const e = clienteEmail?.trim().toLowerCase();
    return e && EMAIL_RE.test(e) ? [e] : [];
  };
  const [open, setOpen] = useState(false);
  const [correos, setCorreos] = useState<string[]>(prefill);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [mostrarCopia, setMostrarCopia] = useState(false);
  const [subject, setSubject] = useState('');
  const [mensaje, setMensaje] = useState('');
  const qc = useQueryClient();

  const enviar = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/cotizaciones/${cotizacionId}/enviar`, {
          to: correos,
          cc: cc.length ? cc : undefined,
          bcc: bcc.length ? bcc : undefined,
          subject: subject.trim() || undefined,
          mensaje: mensaje.trim() || undefined,
        })
      ).data,
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
    if (next) {
      setCorreos(prefill());
    } else {
      setCorreos([]);
    }
    setCc([]);
    setBcc([]);
    setMostrarCopia(false);
    setSubject('');
    setMensaje('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send />
          Enviar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar cotización #{folio}</DialogTitle>
          <DialogDescription>
            Se precarga el correo del cliente del viaje. Personaliza destinatarios,
            asunto y mensaje (todo opcional).
          </DialogDescription>
        </DialogHeader>

        <ChipsCorreo
          id="to"
          label="Para"
          valores={correos}
          onChange={setCorreos}
          placeholder="cliente@correo.com"
        />

        {mostrarCopia ? (
          <>
            <ChipsCorreo id="cc" label="CC (copia)" valores={cc} onChange={setCc} />
            <ChipsCorreo
              id="bcc"
              label="CCO (copia oculta)"
              valores={bcc}
              onChange={setBcc}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarCopia(true)}
            className="self-start text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            + Agregar CC / CCO
          </button>
        )}

        <div className="space-y-2">
          <Label htmlFor="asunto">Asunto</Label>
          <Input
            id="asunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`Cotización #${folio} — (nombre de tu empresa)`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mensaje">Mensaje</Label>
          <Textarea
            id="mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Si lo dejas vacío se envía un mensaje estándar con la cotización adjunta."
            rows={4}
          />
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
