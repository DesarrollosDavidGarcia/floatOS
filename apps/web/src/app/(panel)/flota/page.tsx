'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MoreHorizontal, Paperclip, Pencil, Plus, Trash2, Truck } from 'lucide-react';
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
import { UnidadFormDialog } from '@/components/flota/unidad-form-dialog';
import { DocumentosDialog } from '@/components/flota/documentos-dialog';
import { ArchivosDialog } from '@/components/flota/archivos-dialog';
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
  const [archivosOpen, setArchivosOpen] = useState(false);
  const [unidadArchivos, setUnidadArchivos] = useState<Unidad | null>(null);
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

  function abrirArchivos(unidad: Unidad) {
    setUnidadArchivos(unidad);
    setArchivosOpen(true);
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
            <SearchInput
              value={busqueda}
              onChange={(v) => {
                setBusqueda(v);
                setPage(1);
              }}
              placeholder="Buscar por placas, tipo, marca…"
            />
            <Button className="shrink-0" onClick={abrirNueva}>
              <Plus /> Nueva unidad
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
            <EstadoTabla
              colSpan={6}
              loading={isLoading}
              error={isError ? apiError(error) || 'No se pudieron cargar las unidades.' : null}
              vacio={unidades.length === 0}
              vacioMensaje={
                <>
                  <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {qDebounced
                    ? 'No se encontraron unidades para tu búsqueda.'
                    : 'Aún no hay unidades registradas.'}
                </>
              }
            >
              {unidades.map((u) => (
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
                              {u.marca ? (
                                <CatalogoTexto grupo="MARCA_UNIDAD" codigo={u.marca} />
                              ) : null}
                              {u.marca && u.modelo ? ' ' : null}
                              {u.modelo ? (
                                <CatalogoTexto grupo="MODELO_UNIDAD" codigo={u.modelo} />
                              ) : null}
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
                        <Button variant="ghost" size="icon" aria-label="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => abrirDocumentos(u)}>
                          <FileText className="h-4 w-4" /> Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => abrirArchivos(u)}>
                          <Paperclip className="h-4 w-4" /> Archivos
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
              ))}
            </EstadoTabla>
          </TableBody>
        </Table>
      </div>

      <PaginacionFooter
        page={page}
        totalPaginas={totalPaginas}
        total={data?.total ?? 0}
        singular="unidad"
        plural="unidades"
        onPage={setPage}
      />

      {/* Diálogos */}
      <UnidadFormDialog unidad={unidadEditar} open={formOpen} onOpenChange={setFormOpen} />
      <DocumentosDialog unidad={unidadDocs} open={docsOpen} onOpenChange={setDocsOpen} />
      <ArchivosDialog
        unidad={unidadArchivos}
        open={archivosOpen}
        onOpenChange={setArchivosOpen}
      />

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
