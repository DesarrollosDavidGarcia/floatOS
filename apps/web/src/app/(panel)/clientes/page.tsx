'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CeldaPrincipal, unirSub } from '@/components/conductores/expediente/tabla-ui';
import type { Cliente, Paginado } from './tipos';

const PAGE_SIZE = 10;

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(busqueda, 350);

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
            <Button asChild className="shrink-0">
              <Link href="/clientes/crear">
                <Plus /> Nuevo cliente
              </Link>
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
                Contacto principal
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
              {filas.map((cliente) => {
                const contacto = cliente.contactos?.[0];
                return (
                  <TableRow key={cliente.id}>
                    {/* Cliente: razón social + RFC */}
                    <TableCell>
                      <CeldaPrincipal
                        titulo={
                          <Link href={`/clientes/${cliente.id}/editar`} className="hover:underline">
                            {cliente.razonSocial}
                          </Link>
                        }
                        subtitulo={cliente.rfc || undefined}
                      />
                    </TableCell>

                    {/* Contacto principal: nombre + correo · teléfono */}
                    <TableCell>
                      {contacto ? (
                        <CeldaPrincipal
                          titulo={contacto.nombre}
                          subtitulo={unirSub(contacto.email, contacto.telefono)}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

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
                          <DropdownMenuItem asChild>
                            <Link href={`/clientes/${cliente.id}/editar`}>
                              <Pencil className="h-4 w-4" /> Editar
                            </Link>
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
                );
              })}
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
