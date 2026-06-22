'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bell, Check, MapPin, MonitorSmartphone, Siren, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { horaCorta } from '@/lib/fecha';
import { useNotificaciones, tituloLlegada } from '@/lib/notificaciones';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RANGO_DIAS_DEFAULT,
  etiquetaDocumento,
  textoDiasRestantes,
  variantePorDias,
  type VencimientoAlerta,
} from '@/components/alertas/tipos';

export function NotificationsBell() {
  const {
    notificaciones,
    noLeidas,
    marcarLeida,
    marcarTodasLeidas,
    limpiar,
    permisoEscritorio,
    activarEscritorio,
  } = useNotificaciones();

  const { data } = useQuery({
    queryKey: ['alertas', 'vencimientos', RANGO_DIAS_DEFAULT],
    queryFn: async () => {
      const { data } = await api.get<VencimientoAlerta[]>(
        '/alertas/vencimientos',
        { params: { dias: RANGO_DIAS_DEFAULT } },
      );
      return data;
    },
    staleTime: 60_000,
  });

  const vencimientos = data ?? [];
  const totalVenc = vencimientos.length;
  const hayUrgentes = vencimientos.some((i) => i.diasRestantes <= 3);
  const topVenc = [...vencimientos]
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 5);
  const topLlegadas = notificaciones.slice(0, 6);

  // El badge prioriza las llegadas sin leer; suma los vencimientos próximos.
  const badge = noLeidas + totalVenc;
  const urgente = hayUrgentes || noLeidas > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={badge > 0 ? `Notificaciones, ${badge}` : 'Notificaciones'}
        >
          <Bell className="h-5 w-5" />
          {badge > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
                urgente ? 'bg-destructive' : 'bg-primary',
              )}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          {permisoEscritorio === 'default' && (
            <button
              type="button"
              onClick={activarEscritorio}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <MonitorSmartphone className="h-3.5 w-3.5" />
              Avisos de escritorio
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-auto">
          {/* Avisos en vivo (llegadas + incidencias) */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Avisos en vivo
            </span>
            {topLlegadas.length > 0 && (
              <div className="flex items-center gap-2">
                {noLeidas > 0 && (
                  <button
                    type="button"
                    onClick={marcarTodasLeidas}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Check className="h-3 w-3" />
                    Leídas
                  </button>
                )}
                <button
                  type="button"
                  onClick={limpiar}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpiar
                </button>
              </div>
            )}
          </div>
          {topLlegadas.length === 0 ? (
            <p className="px-3 pb-2 text-xs text-muted-foreground">
              Sin avisos recientes.
            </p>
          ) : (
            topLlegadas.map((n) => {
              const esIncidencia = n.kind === 'incidencia';
              const esCritica = esIncidencia && n.critica;
              return (
                <Link
                  key={n.id}
                  href={`/viajes/${n.viajeId}`}
                  onClick={() => marcarLeida(n.id)}
                  className={cn(
                    'flex items-start gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-accent',
                    !n.leida && 'bg-primary/5',
                    // Las emergencias quedan resaltadas en rojo aunque ya se hayan leído.
                    esCritica && 'bg-destructive/10 hover:bg-destructive/15',
                  )}
                >
                  {esCritica ? (
                    <Siren className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-destructive" />
                  ) : esIncidencia ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <MapPin
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        n.esDestino ? 'text-green-600' : 'text-muted-foreground',
                      )}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        !n.leida && 'font-medium',
                        esCritica && 'font-semibold text-destructive',
                      )}
                    >
                      {esIncidencia ? (n.titulo ?? 'Incidencia reportada') : tituloLlegada(n)}
                    </p>
                    {esCritica && (
                      <span className="mt-0.5 inline-flex items-center rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Emergencia
                      </span>
                    )}
                    {n.escalaDireccion && (
                      <p className="truncate text-xs text-muted-foreground">
                        {n.escalaDireccion}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {horaCorta(n.recibidaEn)}
                  </span>
                </Link>
              );
            })
          )}

          {/* Vencimientos de documentos */}
          <div className="border-t px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vencimientos de documentos
          </div>
          {topVenc.length === 0 ? (
            <p className="px-3 pb-2 text-xs text-muted-foreground">
              Sin vencimientos próximos.
            </p>
          ) : (
            topVenc.map((i, idx) => (
              <div
                key={`${i.tipo}-${i.entidad}-${idx}`}
                className="flex items-start justify-between gap-2 border-b px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.entidad}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {etiquetaDocumento(i.tipoDocumento)} ·{' '}
                    {i.tipo === 'unidad' ? 'Unidad' : 'Conductor'}
                  </p>
                </div>
                <Badge
                  variant={variantePorDias(i.diasRestantes)}
                  className="shrink-0"
                >
                  {textoDiasRestantes(i.diasRestantes)}
                </Badge>
              </div>
            ))
          )}
        </div>

        <Link
          href="/alertas"
          className="block border-t px-3 py-2 text-center text-sm font-medium text-primary hover:underline"
        >
          Ver todas las alertas
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
