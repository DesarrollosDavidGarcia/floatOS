'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowRight, Eye, MoreHorizontal, Plus, Search } from 'lucide-react';
import { EstadoViaje } from '@flotaos/shared-types';
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import type { Paginado } from '@flotaos/shared-types';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CrearViajeDialog } from '@/components/viajes/crear-viaje-dialog';
import type { Viaje } from '@/components/viajes/types';
import {
  CeldaPrincipal,
  Fecha,
  unirSub,
} from '@/components/conductores/expediente/tabla-ui';

const PAGE_SIZE = 20;
const TODOS = '__todos__';

export default function ViajesPage() {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<string>(TODOS);
  const [page, setPage] = useState(1);
  const qDebounced = useDebounce(q);

  const { data, isLoading, isError, isPlaceholderData } = useQuery<Paginado<Viaje>>({
    queryKey: ['viajes', { q: qDebounced, estado, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (qDebounced.trim()) params.q = qDebounced.trim();
      if (estado !== TODOS) params.estado = estado;
      const { data } = await api.get<Paginado<Viaje>>('/viajes', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const viajes = data?.data ?? [];
  const totalPaginas = data?.totalPaginas ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viajes"
        description="Gestiona y monitorea los viajes de la flotilla."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por folio, cliente, dirección…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <CrearViajeDialog />
          </div>
        }
      />

      {/* Fila de filtros secundarios */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={estado}
          onValueChange={(v) => {
            setEstado(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {Object.values(EstadoViaje).map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADO_VIAJE_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table className="[&_td]:py-1.5 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Folio / Cliente
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Ruta
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs uppercase text-muted-foreground">
                Conductor
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs uppercase text-muted-foreground">
                Unidad
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Fecha
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="w-[60px] text-right text-xs uppercase text-muted-foreground">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-destructive">
                  No se pudieron cargar los viajes.
                </TableCell>
              </TableRow>
            ) : viajes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No hay viajes que coincidan.
                </TableCell>
              </TableRow>
            ) : (
              viajes.map((v) => (
                <TableRow
                  key={v.id}
                  className={isPlaceholderData ? 'opacity-60' : undefined}
                >
                  {/* Folio + Cliente */}
                  <TableCell>
                    <CeldaPrincipal
                      titulo={
                        <Link href={`/viajes/${v.id}`} className="hover:underline">
                          {v.folio}
                        </Link>
                      }
                      subtitulo={v.cliente?.nombre}
                    />
                  </TableCell>

                  {/* Ruta: origen → destino */}
                  <TableCell className="hidden md:table-cell max-w-xs">
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="truncate font-medium" title={v.origenDireccion}>
                        {v.origenDireccion}
                      </span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground" title={v.destinoDireccion}>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        {v.destinoDireccion}
                      </span>
                    </div>
                  </TableCell>

                  {/* Conductor */}
                  <TableCell className="hidden lg:table-cell">
                    {v.conductor ? (
                      <CeldaPrincipal
                        titulo={v.conductor.nombre}
                        subtitulo={v.conductor.telefono ?? undefined}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Unidad */}
                  <TableCell className="hidden lg:table-cell">
                    {v.unidad ? (
                      <CeldaPrincipal
                        titulo={v.unidad.placas}
                        subtitulo={unirSub(v.unidad.marca, v.unidad.modelo)}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Fecha programada (o creación como fallback) */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <Fecha iso={v.fechaProgramada ?? v.createdAt} />
                      {v.fechaProgramada && (
                        <span className="text-xs text-muted-foreground">programada</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge variant={ESTADO_VIAJE_BADGE[v.estado]}>
                      {ESTADO_VIAJE_LABEL[v.estado]}
                    </Badge>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/viajes/${v.id}`}>
                            <Eye className="h-4 w-4" /> Ver detalle
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.total} ${data.total === 1 ? 'viaje' : 'viajes'} · Página ${data.page} de ${totalPaginas}`
            : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPaginas}
            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
