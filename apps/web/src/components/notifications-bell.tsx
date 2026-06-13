'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
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

  const items = data ?? [];
  const total = items.length;
  const hayUrgentes = items.some((i) => i.diasRestantes <= 3);
  const top = [...items]
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            total > 0 ? `Notificaciones, ${total} por vencer` : 'Notificaciones'
          }
        >
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
                hayUrgentes ? 'bg-destructive' : 'bg-primary',
              )}
            >
              {total > 9 ? '9+' : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          <span className="text-xs text-muted-foreground">
            {total} por vencer
          </span>
        </div>

        <div className="max-h-80 overflow-auto">
          {top.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sin vencimientos próximos.
            </p>
          ) : (
            top.map((i, idx) => (
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
