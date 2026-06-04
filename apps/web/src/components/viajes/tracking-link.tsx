'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TrackingLink({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/seguimiento/${token}`
      : `/seguimiento/${token}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
      <Button variant="outline" size="icon" onClick={copiar} aria-label="Copiar enlace">
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
