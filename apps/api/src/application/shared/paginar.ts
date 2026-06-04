import { Paginado } from '@flotaos/shared-types';

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

/** Normaliza page/pageSize aplicando piso (1) y tope (PAGE_SIZE_MAX). */
export function normalizarPaginacion(
  page?: number,
  pageSize?: number,
): { page: number; pageSize: number; skip: number; take: number } {
  const p = page && page > 0 ? Math.floor(page) : 1;
  const psRaw = pageSize && pageSize > 0 ? Math.floor(pageSize) : PAGE_SIZE_DEFAULT;
  const ps = Math.min(psRaw, PAGE_SIZE_MAX);
  return { page: p, pageSize: ps, skip: (p - 1) * ps, take: ps };
}

/**
 * Delegado mínimo de un modelo Prisma (count + findMany).
 * Los args van como `any` para aceptar los delegates fuertemente tipados de Prisma
 * (ClienteDelegate, ViajeDelegate, etc.) sin fricción de tipos.
 */
interface ModeloPaginable {
  count: (args: any) => Promise<number>;
  findMany: (args: any) => Promise<any[]>;
}

/**
 * Helper único de paginación para todos los listados.
 * Devuelve el contrato `Paginado<T>` ({ data, total, page, pageSize, totalPaginas }).
 */
export async function paginar<T>(
  modelo: ModeloPaginable,
  opciones: {
    where?: unknown;
    orderBy?: unknown;
    include?: unknown;
    select?: unknown;
    page?: number;
    pageSize?: number;
  },
): Promise<Paginado<T>> {
  const { page, pageSize, skip, take } = normalizarPaginacion(opciones.page, opciones.pageSize);

  const args: Record<string, unknown> = { where: opciones.where, orderBy: opciones.orderBy, skip, take };
  if (opciones.include) args.include = opciones.include;
  if (opciones.select) args.select = opciones.select;

  const [total, data] = await Promise.all([
    modelo.count({ where: opciones.where }),
    modelo.findMany(args),
  ]);

  return {
    data: data as T[],
    total,
    page,
    pageSize,
    totalPaginas: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
