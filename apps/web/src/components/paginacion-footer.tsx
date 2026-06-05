'use client';

import { Button } from '@/components/ui/button';

/**
 * Footer de conteo + paginación compartido por los listados. No se muestra si
 * no hay registros (criterio único; antes unas páginas lo mostraban y otras no).
 */
export function PaginacionFooter({
  page,
  totalPaginas,
  total,
  singular,
  plural,
  onPage,
}: {
  page: number;
  totalPaginas: number;
  total: number;
  singular: string;
  plural: string;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? singular : plural} · Página {page} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPaginas}
          onClick={() => onPage(Math.min(totalPaginas, page + 1))}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
