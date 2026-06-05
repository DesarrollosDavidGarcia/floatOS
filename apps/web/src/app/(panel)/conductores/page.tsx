'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  FileText,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Route,
  Search,
  Trash2,
} from 'lucide-react';
import type { Paginado } from '@flotaos/shared-types';
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
import type { Conductor } from '@/components/conductores/types';
import { ConductorFormDialog } from '@/components/conductores/conductor-form-dialog';
import { DocumentosDialog } from '@/components/conductores/documentos-dialog';
import { ViajesDialog } from '@/components/conductores/viajes-dialog';

const PAGE_SIZE = 10;

function nombreCompleto(c: Conductor): string {
  return `${c.nombre}${c.apellidos ? ` ${c.apellidos}` : ''}`;
}

/** Avatar circular con iniciales del conductor. */
function Avatar({ conductor }: { conductor: Conductor }) {
  const iniciales =
    `${conductor.nombre?.[0] ?? ''}${conductor.apellidos?.[0] ?? ''}`
      .toUpperCase()
      .trim() || '?';
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {iniciales}
    </div>
  );
}

export default function ConductoresPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(busqueda);

  const [crearOpen, setCrearOpen] = useState(false);
  const [editando, setEditando] = useState<Conductor | null>(null);
  const [docsConductor, setDocsConductor] = useState<Conductor | null>(null);
  const [viajesConductor, setViajesConductor] = useState<Conductor | null>(null);
  const [eliminarConductor, setEliminarConductor] = useState<Conductor | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductores', { q, page }],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Conductor>>('/conductores', {
        params: { q: q || undefined, page, pageSize: PAGE_SIZE },
      });
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/conductores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductores'] });
      toast.success('Conductor eliminado');
      setEliminarConductor(null);
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          apiError(err) ||
            'No se puede eliminar: el conductor tiene viajes asociados.',
        );
        return;
      }
      toast.error(apiError(err));
    },
  });

  const conductores = data?.data ?? [];
  const totalPaginas = data?.totalPaginas ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conductores"
        description="Gestiona los conductores de la flotilla, sus documentos e historial."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre, usuario…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button className="shrink-0" onClick={() => setCrearOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo conductor
            </Button>
          </div>
        }
      />

      <div className="rounded-md border">
        <Table className="[&_td]:py-1.5 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Conductor
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Contacto
              </TableHead>
              <TableHead className="hidden lg:table-cell text-xs uppercase text-muted-foreground">
                Licencia
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
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-destructive">
                  No se pudieron cargar los conductores.
                </TableCell>
              </TableRow>
            ) : conductores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No hay conductores que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              conductores.map((c) => (
                <TableRow key={c.id}>
                  {/* Conductor */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar conductor={c} />
                      <div className="flex flex-col">
                        <Link
                          href={`/conductores/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {nombreCompleto(c)}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {c.usuario}
                          {c.puesto ? ' · ' : ''}
                          {c.puesto && (
                            <CatalogoTexto grupo="PUESTO" codigo={c.puesto} />
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Contacto */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span>{c.telefono ?? '—'}</span>
                      {c.email && (
                        <span className="text-xs text-muted-foreground">
                          {c.email}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Licencia */}
                  <TableCell className="hidden lg:table-cell">
                    {c.categoriaLicencia ? (
                      <Badge variant="outline">
                        <CatalogoTexto
                          grupo="CATEGORIA_LICENCIA"
                          codigo={c.categoriaLicencia}
                        />
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge variant={c.activo ? 'success' : 'secondary'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/conductores/${c.id}`}>
                            <FolderOpen className="h-4 w-4" /> Ver expediente
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDocsConductor(c)}>
                          <FileText className="h-4 w-4" /> Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setViajesConductor(c)}>
                          <Route className="h-4 w-4" /> Historial de viajes
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditando(c)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setEliminarConductor(c)}
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

      {data && conductores.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? 'conductor' : 'conductores'} · Página{' '}
            {data.page} de {totalPaginas}
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
      )}

      {/* Crear */}
      <ConductorFormDialog open={crearOpen} onOpenChange={setCrearOpen} />

      {/* Editar */}
      <ConductorFormDialog
        open={Boolean(editando)}
        onOpenChange={(o) => {
          if (!o) setEditando(null);
        }}
        conductor={editando ?? undefined}
      />

      {/* Documentos */}
      <DocumentosDialog
        conductor={docsConductor}
        open={Boolean(docsConductor)}
        onOpenChange={(o) => {
          if (!o) setDocsConductor(null);
        }}
      />

      {/* Historial de viajes */}
      <ViajesDialog
        conductor={viajesConductor}
        open={Boolean(viajesConductor)}
        onOpenChange={(o) => {
          if (!o) setViajesConductor(null);
        }}
      />

      {/* Confirmar eliminación */}
      <ConfirmDialog
        open={Boolean(eliminarConductor)}
        onOpenChange={(o) => {
          if (!o) setEliminarConductor(null);
        }}
        title="Eliminar conductor"
        description={
          eliminarConductor
            ? `¿Eliminar a ${nombreCompleto(eliminarConductor)}? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (eliminarConductor) await eliminar.mutateAsync(eliminarConductor.id);
        }}
      />
    </div>
  );
}
