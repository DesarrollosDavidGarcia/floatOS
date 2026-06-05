'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MoreHorizontal, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { UnidadFormDialog } from '@/components/flota/unidad-form-dialog';
import { DocumentosDialog } from '@/components/flota/documentos-dialog';
import type { Paginado, Unidad } from '@/components/flota/types';

const PAGE_SIZE = 10;

export default function FlotaPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const qDebounced = useDebounce(busqueda);

  const [formOpen, setFormOpen] = useState(false);
  const [unidadEditar, setUnidadEditar] = useState<Unidad | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [unidadDocs, setUnidadDocs] = useState<Unidad | null>(null);
  const [eliminarUnidad, setEliminarUnidad] = useState<Unidad | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['unidades', qDebounced, page],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Unidad>>('/unidades', {
        params: { q: qDebounced || undefined, page, pageSize: PAGE_SIZE },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/unidades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Unidad eliminada');
      setEliminarUnidad(null);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function abrirNueva() {
    setUnidadEditar(null);
    setFormOpen(true);
  }

  function abrirEdicion(unidad: Unidad) {
    setUnidadEditar(unidad);
    setFormOpen(true);
  }

  function abrirDocumentos(unidad: Unidad) {
    setUnidadDocs(unidad);
    setDocsOpen(true);
  }

  const unidades = data?.data ?? [];
  const totalPaginas = data?.totalPaginas ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flota"
        description="Unidades de la flotilla y sus documentos."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por placas, tipo, marca…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button className="shrink-0" onClick={abrirNueva}>
              <Plus className="mr-1 h-4 w-4" /> Nueva unidad
            </Button>
          </div>
        }
      />

      <div className="rounded-md border">
        <Table className="[&_td]:py-1.5 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Unidad
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs uppercase text-muted-foreground">
                Año
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Capacidad (kg)
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Aseguradora
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
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  {apiError(error)}
                </TableCell>
              </TableRow>
            ) : unidades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No se encontraron unidades.
                </TableCell>
              </TableRow>
            ) : (
              unidades.map((u) => (
                <TableRow key={u.id}>
                  {/* Unidad: placas + tipo · marca/modelo */}
                  <TableCell>
                    <CeldaPrincipal
                      titulo={u.placas}
                      subtitulo={
                        <>
                          <CatalogoTexto grupo="TIPO_UNIDAD" codigo={u.tipo} />
                          {(u.marca || u.modelo) && (
                            <>
                              {' · '}
                              {[u.marca, u.modelo].filter(Boolean).join(' ')}
                            </>
                          )}
                        </>
                      }
                    />
                  </TableCell>

                  {/* Año */}
                  <TableCell className="hidden lg:table-cell">{u.anio ?? '—'}</TableCell>

                  {/* Capacidad */}
                  <TableCell className="hidden md:table-cell">
                    {u.capacidadKg != null
                      ? u.capacidadKg.toLocaleString('es-MX')
                      : '—'}
                  </TableCell>

                  {/* Aseguradora */}
                  <TableCell className="hidden md:table-cell">
                    {u.aseguradora ? (
                      <CatalogoTexto grupo="ASEGURADORA" codigo={u.aseguradora} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge variant={u.activo ? 'success' : 'secondary'}>
                      {u.activo ? 'Activa' : 'Inactiva'}
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
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => abrirDocumentos(u)}>
                          <FileText className="h-4 w-4" /> Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => abrirEdicion(u)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setEliminarUnidad(u)}
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
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

      {/* Conteo y paginación — siempre visible cuando hay datos */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.total} ${data.total === 1 ? 'unidad' : 'unidades'} · Página ${data.page} de ${totalPaginas}`
            : ' '}
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

      {/* Diálogos */}
      <UnidadFormDialog unidad={unidadEditar} open={formOpen} onOpenChange={setFormOpen} />
      <DocumentosDialog unidad={unidadDocs} open={docsOpen} onOpenChange={setDocsOpen} />

      {/* Confirmar eliminación */}
      <ConfirmDialog
        open={Boolean(eliminarUnidad)}
        onOpenChange={(o) => {
          if (!o) setEliminarUnidad(null);
        }}
        title="Eliminar unidad"
        description={
          eliminarUnidad
            ? `¿Eliminar la unidad ${eliminarUnidad.placas}? Si tiene viajes asociados no podrá eliminarse. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (eliminarUnidad) await deleteMutation.mutateAsync(eliminarUnidad.id);
        }}
      />
    </div>
  );
}
