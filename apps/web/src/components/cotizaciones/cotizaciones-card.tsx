'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileDown } from 'lucide-react';
import { WS_EVENTS, type CotizacionActualizadaPayload } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { invalidarViajes } from '@/lib/query-keys';
import {
  ESTADO_COTIZACION_BADGE,
  ESTADO_COTIZACION_LABEL,
  formatearMoneda,
} from '@/lib/estado-cotizacion';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Viaje } from '@/components/viajes/types';
import type { Cotizacion } from './types';
import { CotizarDialog } from './cotizar-dialog';
import { EnviarCotizacionDialog } from './enviar-cotizacion-dialog';
import { CotizacionAcciones } from './cotizacion-acciones';

async function descargarPdf(id: string, folio: number) {
  try {
    const { data } = await api.get(`/cotizaciones/${id}/pdf`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data as Blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    toast.error(apiError(err));
  }
}

export function CotizacionesCard({
  viaje,
  plano = false,
}: {
  viaje: Viaje;
  /** Sin la Card externa (para anidar en una sección colapsable). */
  plano?: boolean;
}) {
  const qc = useQueryClient();
  const { data: cotizaciones } = useQuery<Cotizacion[]>({
    queryKey: ['cotizaciones', viaje.id],
    queryFn: async () =>
      (await api.get<Cotizacion[]>(`/viajes/${viaje.id}/cotizaciones`)).data,
  });

  // Tiempo real: cuando el worker termina el envío async de una cotización emite
  // 'cotizacion:actualizada' a la sala admin. Refrescamos el listado del viaje
  // afectado. Es complementario al refetch perezoso del diálogo (por si el WS no
  // estuviera disponible).
  useEffect(() => {
    const socket = getSocket();
    const refrescar = (payload: CotizacionActualizadaPayload) => {
      if (payload?.viajeId !== viaje.id) return;
      qc.invalidateQueries({ queryKey: ['cotizaciones', viaje.id] });
      invalidarViajes(qc, viaje.id);
    };
    socket.on(WS_EVENTS.COTIZACION_ACTUALIZADA, refrescar);
    return () => {
      socket.off(WS_EVENTS.COTIZACION_ACTUALIZADA, refrescar);
    };
  }, [qc, viaje.id]);

  const lista =
    (cotizaciones?.length ?? 0) === 0 ? (
      <p className="text-muted-foreground">Aún no hay cotizaciones.</p>
    ) : (
      cotizaciones!.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <div>
                <p className="font-medium">
                  #{c.folio} · {formatearMoneda(c.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(c.createdAt), 'd MMM yyyy, HH:mm', { locale: es })}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant={ESTADO_COTIZACION_BADGE[c.estado]}>
                  {ESTADO_COTIZACION_LABEL[c.estado]}
                </Badge>
                {c.estado === 'BORRADOR' && (
                  <CotizarDialog viaje={viaje} cotizacion={c} />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => descargarPdf(c.id, c.folio)}
                >
                  <FileDown />
                  PDF
                </Button>
                <EnviarCotizacionDialog
                  cotizacionId={c.id}
                  folio={c.folio}
                  viajeId={viaje.id}
                  clienteEmail={viaje.cliente?.contactos?.[0]?.email ?? null}
                />
                <CotizacionAcciones
                  cotizacionId={c.id}
                  folio={c.folio}
                  estado={c.estado}
                  viajeId={viaje.id}
                />
              </div>
            </div>
          ))
    );

  if (plano) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Calcula y guarda cotizaciones del viaje.
          </p>
          <CotizarDialog viaje={viaje} />
        </div>
        {lista}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Cotizaciones</CardTitle>
          <CardDescription>Calcula y guarda cotizaciones del viaje</CardDescription>
        </div>
        <CotizarDialog viaje={viaje} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{lista}</CardContent>
    </Card>
  );
}
