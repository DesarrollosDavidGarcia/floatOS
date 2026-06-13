'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fechaCorta } from '@/lib/fecha';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import type { Paginado } from '@flotaos/shared-types';
import type { Conductor, ViajeConductor } from './types';

export function ViajesDialog({
  conductor,
  open,
  onOpenChange,
}: {
  conductor: Conductor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const conductorId = conductor?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-viajes', conductorId],
    queryFn: async () => {
      const { data } = await api.get<Paginado<ViajeConductor>>(
        `/conductores/${conductorId}/viajes`,
      );
      return data.data;
    },
    enabled: open && Boolean(conductorId),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de viajes</DialogTitle>
          <DialogDescription>
            {conductor
              ? `${conductor.nombre}${conductor.apellidos ? ` ${conductor.apellidos}` : ''}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-auto">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              No se pudo cargar el historial.
            </p>
          ) : !data || data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este conductor no tiene viajes registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Origen → Destino</TableHead>
                  <TableHead>Programada</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">#{v.folio}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <span className="block truncate text-sm">
                        {v.origenDireccion} → {v.destinoDireccion}
                      </span>
                      <span className="block text-xs text-muted-foreground">{v.tipoCarga}</span>
                    </TableCell>
                    <TableCell>{fechaCorta(v.fechaProgramada)}</TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VIAJE_BADGE[v.estado]}>
                        {ESTADO_VIAJE_LABEL[v.estado]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
