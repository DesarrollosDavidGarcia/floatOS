'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import type { EstadoCotizacion } from '@/components/cotizaciones/types';
import { api, apiError } from '@/lib/api';
import { invalidarCotizaciones } from '@/lib/query-keys';
import {
  ACCION_ESTADO_LABEL,
  ESTADO_COTIZACION_LABEL,
  TRANSICIONES_COTIZACION,
} from '@/lib/estado-cotizacion';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CotizacionAcciones({
  cotizacionId,
  folio,
  estado,
  viajeId,
}: {
  cotizacionId: string;
  folio: number;
  estado: EstadoCotizacion;
  viajeId: string;
}) {
  const qc = useQueryClient();
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const refrescar = () => invalidarCotizaciones(qc, viajeId);

  const cambiarEstado = useMutation({
    mutationFn: async (nuevo: EstadoCotizacion) =>
      (await api.patch(`/cotizaciones/${cotizacionId}/estado`, { estado: nuevo })).data,
    onSuccess: (_d, nuevo) => {
      toast.success(`Cotización #${folio}: ${ESTADO_COTIZACION_LABEL[nuevo]}`);
      refrescar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const duplicar = useMutation({
    mutationFn: async () =>
      (await api.post(`/cotizaciones/${cotizacionId}/duplicar`)).data,
    onSuccess: (nueva: { folio: number }) => {
      toast.success(`Cotización duplicada (#${nueva.folio})`);
      refrescar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/cotizaciones/${cotizacionId}`)).data,
    onSuccess: () => {
      toast.success(`Cotización #${folio} eliminada`);
      refrescar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const ocupado =
    cambiarEstado.isPending || duplicar.isPending || eliminar.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más acciones" disabled={ocupado}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {TRANSICIONES_COTIZACION[estado].map((destino) => (
            <DropdownMenuItem
              key={destino}
              onSelect={() => cambiarEstado.mutate(destino)}
            >
              {ACCION_ESTADO_LABEL[destino]}
            </DropdownMenuItem>
          ))}
          {TRANSICIONES_COTIZACION[estado].length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => duplicar.mutate()}>
            <Copy className="h-4 w-4" /> Duplicar
          </DropdownMenuItem>
          {estado === 'BORRADOR' && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmarEliminar(true);
              }}
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmarEliminar}
        onOpenChange={setConfirmarEliminar}
        title={`Eliminar cotización #${folio}`}
        description="Esta acción no se puede deshacer. Solo se eliminan borradores."
        confirmLabel="Eliminar"
        onConfirm={() => eliminar.mutateAsync()}
      />
    </>
  );
}
