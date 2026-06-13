'use client';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { useCatalogo } from '@/lib/catalogos';

/** Muestra el nombre de un código de catálogo como texto plano (para celdas). */
export function CatalogoTexto({
  grupo,
  codigo,
}: {
  grupo: string;
  codigo?: string | null;
}) {
  const { data: items } = useCatalogo(grupo);
  if (!codigo) return <span className="text-muted-foreground">—</span>;
  const item = items?.find((i) => i.codigo === codigo);
  return <>{item?.nombre ?? codigo}</>;
}

/**
 * Badge cuyo color y etiqueta vienen del catálogo (grupos coloreables como
 * resultado de examen, gravedad, nivel de aptitud).
 */
export function CatalogoBadge({
  grupo,
  codigo,
  fallbackVariant = 'secondary',
}: {
  grupo: string;
  codigo?: string | null;
  fallbackVariant?: BadgeVariant;
}) {
  const { data: items } = useCatalogo(grupo);
  if (!codigo) return <span className="text-muted-foreground">—</span>;
  const item = items?.find((i) => i.codigo === codigo);
  const variant = (item?.color as BadgeVariant) || fallbackVariant;
  return <Badge variant={variant}>{item?.nombre ?? codigo}</Badge>;
}
