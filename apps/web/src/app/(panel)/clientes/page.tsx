'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ClienteFormDialog } from '@/components/clientes/cliente-form-dialog';
import type { Cliente, Paginado } from './tipos';

const PAGE_SIZE = 10;

export default function ClientesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const debouncedQ = useDebounce(q, 350);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clientes', { q: debouncedQ, page, pageSize: PAGE_SIZE }],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Cliente>>('/clientes', {
        params: { q: debouncedQ || undefined, page, pageSize: PAGE_SIZE },
      });
      return data;
    },
  });

  function onBuscar(value: string) {
    setQ(value);
    setPage(1);
  }

  async function eliminar(cliente: Cliente) {
    try {
      await api.delete(`/clientes/${cliente.id}`);
      toast.success('Cliente eliminado');
      // Si era el último de la página, retrocede una.
      if ((query.data?.data.length ?? 0) === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
      }
    } catch (err) {
      // 409 si el cliente tiene viajes asociados: muestra el mensaje del backend.
      toast.error(apiError(err));
    }
  }

  const data = query.data;
  const total = data?.total ?? 0;
  const totalPaginas = data?.totalPaginas ?? 0;
  const filas = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Administra los clientes a los que asignas viajes."
        action={
          <ClienteFormDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            }
          />
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por razón social, RFC…"
          value={q}
          onChange={(e) => onBuscar(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón social</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-destructive">
                    {apiError(query.error)}
                  </TableCell>
                </TableRow>
              ) : filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {debouncedQ
                      ? 'No se encontraron clientes para tu búsqueda.'
                      : 'Aún no hay clientes registrados.'}
                  </TableCell>
                </TableRow>
              ) : (
                filas.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.razonSocial}</TableCell>
                    <TableCell>{cliente.rfc || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{cliente.contactoNombre || '—'}</span>
                        {cliente.contactoEmail ? (
                          <span className="text-xs text-muted-foreground">
                            {cliente.contactoEmail}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{cliente.contactoTelefono || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => setEditando(cliente)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" title="Eliminar">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          title="Eliminar cliente"
                          description={`¿Seguro que deseas eliminar a "${cliente.razonSocial}"? Esta acción no se puede deshacer.`}
                          confirmLabel="Eliminar"
                          onConfirm={() => eliminar(cliente)}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total} cliente${total === 1 ? '' : 's'} en total`
            : 'Sin resultados'}
        </p>
        {totalPaginas > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || query.isFetching}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              disabled={page >= totalPaginas || query.isFetching}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {/* Diálogo de edición controlado, reutiliza el mismo formulario. */}
      <ClienteFormDialog
        cliente={editando}
        open={editando !== null}
        onOpenChange={(open) => {
          if (!open) setEditando(null);
        }}
      />
    </div>
  );
}
