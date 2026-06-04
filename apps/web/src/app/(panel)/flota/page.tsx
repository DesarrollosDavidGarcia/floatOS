'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UnidadFormDialog } from '@/components/flota/unidad-form-dialog';
import { DocumentosDialog } from '@/components/flota/documentos-dialog';
import type { Paginado, Unidad } from '@/components/flota/types';

const PAGE_SIZE = 10;

export default function FlotaPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const qDebounced = useDebounce(q);

  const [formOpen, setFormOpen] = useState(false);
  const [unidadEditar, setUnidadEditar] = useState<Unidad | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [unidadDocs, setUnidadDocs] = useState<Unidad | null>(null);

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
          <Button onClick={abrirNueva}>
            <Plus className="mr-1.5 h-4 w-4" /> Nueva unidad
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por placas, tipo, marca…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placas</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Capacidad (kg)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    {apiError(error)}
                  </TableCell>
                </TableRow>
              ) : unidades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No se encontraron unidades.
                  </TableCell>
                </TableRow>
              ) : (
                unidades.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.placas}</TableCell>
                    <TableCell>{u.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[u.marca, u.modelo].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell>{u.anio ?? '—'}</TableCell>
                    <TableCell>
                      {u.capacidadKg != null ? u.capacidadKg.toLocaleString('es-MX') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.activo ? 'success' : 'secondary'}>
                        {u.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDocumentos(u)}
                        >
                          <FileText className="mr-1 h-4 w-4" /> Documentos
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEdicion(u)}
                          aria-label="Editar unidad"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Eliminar unidad">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          title="Eliminar unidad"
                          description={`¿Eliminar la unidad ${u.placas}? Si tiene viajes asociados no podrá eliminarse.`}
                          confirmLabel="Eliminar"
                          onConfirm={() => deleteMutation.mutateAsync(u.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} unidad{data.total === 1 ? '' : 'es'} · página {data.page} de {totalPaginas}
          </span>
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
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <UnidadFormDialog unidad={unidadEditar} open={formOpen} onOpenChange={setFormOpen} />
      <DocumentosDialog unidad={unidadDocs} open={docsOpen} onOpenChange={setDocsOpen} />
    </div>
  );
}
