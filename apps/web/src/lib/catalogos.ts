'use client';

import { useQuery } from '@tanstack/react-query';
import type { CatalogoItem } from '@flotaos/shared-types';
import { api } from './api';

/**
 * Carga (y cachea) los items de un grupo de catálogo. Trae todos (activos e
 * inactivos) para poder resolver etiquetas de valores históricos; los dropdowns
 * filtran por `activo`.
 */
export function useCatalogo(grupo: string) {
  return useQuery({
    queryKey: ['catalogo', grupo],
    queryFn: async () => {
      const { data } = await api.get<CatalogoItem[]>(`/catalogos/${grupo}`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Etiqueta visible de un código dentro de una lista de items (o el código tal cual). */
export function catalogoLabel(
  items: CatalogoItem[] | undefined,
  codigo?: string | null,
): string {
  if (!codigo) return '—';
  return items?.find((i) => i.codigo === codigo)?.nombre ?? codigo;
}

/** Variante de badge (color) asociada a un código, con respaldo 'secondary'. */
export function catalogoColor(
  items: CatalogoItem[] | undefined,
  codigo?: string | null,
): string {
  return items?.find((i) => i.codigo === codigo)?.color ?? 'secondary';
}
