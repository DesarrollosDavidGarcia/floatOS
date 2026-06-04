'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Circle } from 'lucide-react';
import { ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import type { HistorialViaje } from './types';

export function HistorialTimeline({ historial }: { historial: HistorialViaje[] }) {
  if (!historial || historial.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>;
  }

  const ordenado = [...historial].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ol className="relative space-y-5 border-l pl-6">
      {ordenado.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center">
            <Circle className="h-3 w-3 fill-primary text-primary" />
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
            {h.estadoAnterior ? (
              <>
                <span className="text-muted-foreground">
                  {ESTADO_VIAJE_LABEL[h.estadoAnterior]}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </>
            ) : null}
            <span>{ESTADO_VIAJE_LABEL[h.estadoNuevo]}</span>
          </div>
          <time className="text-xs text-muted-foreground">
            {format(new Date(h.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
          </time>
          {h.nota ? <p className="mt-1 text-sm text-muted-foreground">{h.nota}</p> : null}
        </li>
      ))}
    </ol>
  );
}
