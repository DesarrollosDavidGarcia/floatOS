'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EstadoViaje } from '@flotaos/shared-types';
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import type { Paginado } from '@flotaos/shared-types';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
        action={<CrearViajeDialog />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio, cliente, dirección…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={estado}
          onValueChange={(v) => {
            setEstado(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Conductor</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    No se pudieron cargar los viajes.
                  </TableCell>
                </TableRow>
              ) : viajes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No hay viajes que coincidan.
                  </TableCell>
                </TableRow>
              ) : (
                viajes.map((v) => (
                  <TableRow
                    key={v.id}
                    className={isPlaceholderData ? 'opacity-60' : undefined}
                  >
                    <TableCell className="font-medium">
                      <Link href={`/viajes/${v.id}`} className="hover:underline">
                        {v.folio}
                      </Link>
                    </TableCell>
                    <TableCell>{v.cliente?.nombre ?? '—'}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="truncate" title={v.origenDireccion}>
                          {v.origenDireccion}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate" title={v.destinoDireccion}>
                          {v.destinoDireccion}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{v.conductor?.nombre ?? '—'}</TableCell>
                    <TableCell>{v.unidad?.placas ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VIAJE_BADGE[v.estado]}>
                        {ESTADO_VIAJE_LABEL[v.estado]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} viaje(s) · página ${data.page} de ${totalPaginas}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPaginas}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
