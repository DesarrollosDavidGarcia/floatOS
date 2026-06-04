'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, FolderOpen, Pencil, Plus, Route, Trash2 } from 'lucide-react';
import type { Paginado } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Conductor } from '@/components/conductores/types';
import { ConductorFormDialog } from '@/components/conductores/conductor-form-dialog';
import { DocumentosDialog } from '@/components/conductores/documentos-dialog';
import { ViajesDialog } from '@/components/conductores/viajes-dialog';

const PAGE_SIZE = 10;

export default function ConductoresPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(busqueda);

  const [crearOpen, setCrearOpen] = useState(false);
  const [editando, setEditando] = useState<Conductor | null>(null);
  const [docsConductor, setDocsConductor] = useState<Conductor | null>(null);
  const [viajesConductor, setViajesConductor] = useState<Conductor | null>(null);

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
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(apiError(err) || 'No se puede eliminar: el conductor tiene viajes asociados.');
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
          <Button onClick={() => setCrearOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo conductor
          </Button>
        }
      />

      <div className="max-w-sm">
        <Input
          placeholder="Buscar por nombre, usuario…"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-destructive">
                  No se pudieron cargar los conductores.
                </TableCell>
              </TableRow>
            ) : conductores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay conductores que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              conductores.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.nombre}
                    {c.apellidos ? ` ${c.apellidos}` : ''}
                  </TableCell>
                  <TableCell>{c.usuario}</TableCell>
                  <TableCell>{c.telefono ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? 'success' : 'secondary'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver expediente"
                        asChild
                      >
                        <Link href={`/conductores/${c.id}`}>
                          <FolderOpen className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Documentos"
                        onClick={() => setDocsConductor(c)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Historial de viajes"
                        onClick={() => setViajesConductor(c)}
                      >
                        <Route className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setEditando(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" title="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Eliminar conductor"
                        description={`¿Eliminar a ${c.nombre}${c.apellidos ? ` ${c.apellidos}` : ''}? Esta acción no se puede deshacer.`}
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(c.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {totalPaginas} · {data.total} conductores
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
    </div>
  );
}
