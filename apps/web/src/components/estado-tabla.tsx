'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/**
 * Estados de un <TableBody> compartidos por los listados: carga (skeleton),
 * error y vacío. Si no aplica ninguno, renderiza las filas (`children`).
 * Unifica el nº de filas skeleton y el manejo de error/vacío entre páginas.
 */
export function EstadoTabla({
  colSpan,
  loading,
  error,
  vacio,
  vacioMensaje,
  filasSkeleton = 8,
  children,
}: {
  colSpan: number;
  loading: boolean;
  error?: string | null;
  vacio: boolean;
  vacioMensaje: ReactNode;
  filasSkeleton?: number;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <>
        {Array.from({ length: filasSkeleton }).map((_, i) => (
          <TableRow key={i}>
            <TableCell colSpan={colSpan}>
              <Skeleton className="h-10 w-full" />
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  }
  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-10 text-center text-destructive">
          {error}
        </TableCell>
      </TableRow>
    );
  }
  if (vacio) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
          {vacioMensaje}
        </TableCell>
      </TableRow>
    );
  }
  return <>{children}</>;
}
