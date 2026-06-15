'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Container, MoreHorizontal, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/search-input';
import { PaginacionFooter } from '@/components/paginacion-footer';
import { EstadoTabla } from '@/components/estado-tabla';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import { CeldaPrincipal } from '@/components/conductores/expediente/tabla-ui';
import { CajaFormDialog } from '@/components/flota/caja-form-dialog';
import type { Caja, Paginado } from '@/components/flota/types';

const PAGE_SIZE = 10;

export default function CajasPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const qDebounced = useDebounce(busqueda);

  const [formOpen, setFormOpen] = useState(false);
  const [cajaEditar, setCajaEditar] = useState<Caja | null>(null);
  const [eliminarCaja, setEliminarCaja] = useState<Caja | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cajas', qDebounced, page],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Caja>>('/cajas', {
        params: { q: qDebounced || undefined, page, pageSize: PAGE_SIZE },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cajas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cajas'] });
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'cajas'] });
      toast.success('Caja eliminada');
      setEliminarCaja(null);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function abrirNueva() {
    setCajaEditar(null);
    setFormOpen(true);
  }

  function abrirEdicion(caja: Caja) {
    setCajaEditar(caja);
    setFormOpen(true);
  }

  const cajas = data?.data ?? [];
  const totalPaginas = data?.totalPaginas ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cajas / remolques"
        description="Cajas intercambiables de la flotilla (se enganchan a un tractor)."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button variant="outline" className="shrink-0" asChild>
              <Link href="/flota">
                <Truck /> Unidades
              </Link>
            </Button>
            <SearchInput
              value={busqueda}
              onChange={(v) => {
                setBusqueda(v);
                setPage(1);
              }}
              placeholder="Buscar por placas, tipo…"
            />
            <Button className="shrink-0" onClick={abrirNueva}>
              <Plus /> Nueva caja
            </Button>
          </div>
        }
      />

      <div className="rounded-md border">
        <Table className="[&_td]:py-1.5 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase text-muted-foreground">Caja</TableHead>
              <TableHead className="hidden lg:table-cell text-xs uppercase text-muted-foreground">
                Año
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Cap. (kg)
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Cap. (m³)
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">Estado</TableHead>
              <TableHead className="w-[60px] text-right text-xs uppercase text-muted-foreground">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <EstadoTabla
              colSpan={6}
              loading={isLoading}
              error={isError ? apiError(error) || 'No se pudieron cargar las cajas.' : null}
              vacio={cajas.length === 0}
              vacioMensaje={
                <>
                  <Container className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {qDebounced
                    ? 'No se encontraron cajas para tu búsqueda.'
                    : 'Aún no hay cajas registradas.'}
                </>
              }
            >
              {cajas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <CeldaPrincipal
                      titulo={c.placas}
                      subtitulo={<CatalogoTexto grupo="TIPO_CAJA" codigo={c.tipo} />}
                    />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{c.anio ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.capacidadKg != null ? c.capacidadKg.toLocaleString('es-MX') : '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.capacidadM3 != null ? c.capacidadM3.toLocaleString('es-MX') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? 'success' : 'secondary'}>
                      {c.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => abrirEdicion(c)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setEliminarCaja(c)}
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </EstadoTabla>
          </TableBody>
        </Table>
      </div>

      <PaginacionFooter
        page={page}
        totalPaginas={totalPaginas}
        total={data?.total ?? 0}
        singular="caja"
        plural="cajas"
        onPage={setPage}
      />

      <CajaFormDialog caja={cajaEditar} open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={Boolean(eliminarCaja)}
        onOpenChange={(o) => {
          if (!o) setEliminarCaja(null);
        }}
        title="Eliminar caja"
        description={
          eliminarCaja
            ? `¿Eliminar la caja ${eliminarCaja.placas}? Si tiene viajes asociados no podrá eliminarse. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (eliminarCaja) await deleteMutation.mutateAsync(eliminarCaja.id);
        }}
      />
    </div>
  );
}
