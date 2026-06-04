'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import type { ViajeResumen } from './tipos';

function nombreConductor(viaje: ViajeResumen): string {
  if (!viaje.conductor) return 'Sin asignar';
  return `${viaje.conductor.nombre} ${viaje.conductor.apellidos}`.trim();
}

export function ViajesActivosCard({
  viajes,
  loading,
}: {
  viajes: ViajeResumen[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Viajes activos</CardTitle>
        <CardDescription>Viajes en curso de la flotilla.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : viajes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay viajes activos en este momento.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Conductor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajes.map((viaje) => (
                <TableRow key={viaje.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/viajes/${viaje.id}`}
                      className="text-primary hover:underline"
                    >
                      #{viaje.folio}
                    </Link>
                  </TableCell>
                  <TableCell>{viaje.cliente?.razonSocial ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VIAJE_BADGE[viaje.estado]}>
                      {ESTADO_VIAJE_LABEL[viaje.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell>{nombreConductor(viaje)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
