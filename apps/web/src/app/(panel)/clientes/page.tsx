'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClienteFormDialog } from '@/components/clientes/cliente-form-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CeldaPrincipal, unirSub } from '@/components/conductores/expediente/tabla-ui';
import type { Cliente, Paginado } from './tipos';

const PAGE_SIZE = 10;

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(busqueda, 350);

  const [crearOpen, setCrearOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [eliminarCliente, setEliminarCliente] = useState<Cliente | null>(null);

  const query = useQuery({
    queryKey: ['clientes', { q: debouncedQ, page, pageSize: PAGE_SIZE }],
    queryFn: async () => {
      const { data } = await api.get<Paginado<Cliente>>('/clientes', {
        params: { q: debouncedQ || undefined, page, pageSize: PAGE_SIZE },
      });
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clientes/${id}`);
    },
    onSuccess: () => {
      // Si era el último de la página, retrocede una.
      if ((query.data?.data.length ?? 0) === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
      }
      toast.success('Cliente eliminado');
      setEliminarCliente(null);
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          apiError(err) || 'No se puede eliminar: el cliente tiene viajes asociados.',
        );
        return;
      }
      toast.error(apiError(err));
    },
  });

  const data = query.data;
  const total = data?.total ?? 0;
  const totalPaginas = data?.totalPaginas ?? 1;
  const filas = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Administra los clientes a los que asignas viajes."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <SearchInput
              value={busqueda}
              onChange={(v) => {
                setBusqueda(v);
                setPage(1);
              }}
              placeholder="Buscar por razón social, RFC…"
            />
            <Button className="shrink-0" onClick={() => setCrearOpen(true)}>
              <Plus /> Nuevo cliente
            </Button>
          </div>
        }
      />

      <div className="rounded-md border">
        <Table className="[&_td]:py-1.5 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Cliente
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Teléfono
              </TableHead>
              <TableHead className="hidden md:table-cell text-xs uppercase text-muted-foreground">
                Dirección
              </TableHead>
              <TableHead className="w-[60px] text-right text-xs uppercase text-muted-foreground">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <EstadoTabla
              colSpan={4}
              loading={query.isLoading}
              error={query.isError ? apiError(query.error) || 'No se pudieron cargar los clientes.' : null}
              vacio={filas.length === 0}
              vacioMensaje={
                debouncedQ
                  ? 'No se encontraron clientes para tu búsqueda.'
                  : 'Aún no hay clientes registrados.'
              }
            >
              {filas.map((cliente) => (
                <TableRow key={cliente.id}>
                  {/* Cliente: razón social + RFC · contacto */}
                  <TableCell>
                    <CeldaPrincipal
                      titulo={cliente.razonSocial}
                      subtitulo={unirSub(cliente.rfc, cliente.contactoNombre, cliente.contactoEmail)}
                    />
                  </TableCell>

                  {/* Teléfono */}
                  <TableCell>{cliente.contactoTelefono || '—'}</TableCell>

                  {/* Dirección */}
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                    {cliente.direccion || '—'}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setEditando(cliente)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setEliminarCliente(cliente)}
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
        total={total}
        singular="cliente"
        plural="clientes"
        onPage={setPage}
      />

      {/* Crear */}
      <ClienteFormDialog open={crearOpen} onOpenChange={setCrearOpen} />

      {/* Editar */}
      <ClienteFormDialog
        cliente={editando}
        open={editando !== null}
        onOpenChange={(o) => {
          if (!o) setEditando(null);
        }}
      />

      {/* Confirmar eliminación */}
      <ConfirmDialog
        open={Boolean(eliminarCliente)}
        onOpenChange={(o) => {
          if (!o) setEliminarCliente(null);
        }}
        title="Eliminar cliente"
        description={
          eliminarCliente
            ? `¿Eliminar a "${eliminarCliente.razonSocial}"? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (eliminarCliente) await eliminar.mutateAsync(eliminarCliente.id);
        }}
      />
    </div>
  );
}
