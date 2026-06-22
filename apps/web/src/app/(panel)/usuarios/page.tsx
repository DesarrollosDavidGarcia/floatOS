'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EstadoTabla } from '@/components/estado-tabla';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type Rol = 'ADMIN' | 'MONITORISTA';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  type: 'admin';
}

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  MONITORISTA: 'Monitorista',
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [eliminar, setEliminar] = useState<Usuario | null>(null);

  const query = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data } = await api.get<Usuario[]>('/usuarios');
      return data;
    },
  });

  const eliminarMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/usuarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario eliminado');
      setEliminar(null);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const cambiarActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      await api.patch(`/usuarios/${id}`, { activo });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(vars.activo ? 'Usuario activado' : 'Usuario desactivado');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const filas = query.data ?? [];

  function abrirCrear() {
    setEditando(null);
    setFormAbierto(true);
  }
  function abrirEditar(u: Usuario) {
    setEditando(u);
    setFormAbierto(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Administra las cuentas del panel: administradores y monitoristas."
        action={
          <Button onClick={abrirCrear} className="shrink-0">
            <Plus /> Nuevo usuario
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table className="[&_td]:py-1.5 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Usuario
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Rol
              </TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <EstadoTabla
              colSpan={4}
              loading={query.isLoading}
              error={query.isError ? apiError(query.error) : null}
              vacio={filas.length === 0}
              vacioMensaje="No hay usuarios todavía."
            >
              {filas.map((u) => {
                const esYoMismo = u.id === user?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <UserCog className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {u.nombre}
                            {esYoMismo ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (tú)
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.rol === 'ADMIN' ? 'default' : 'secondary'}>
                        {ETIQUETA_ROL[u.rol]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.activo ? 'success' : 'outline'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => abrirEditar(u)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={esYoMismo || cambiarActivo.isPending}
                            onClick={() =>
                              cambiarActivo.mutate({ id: u.id, activo: !u.activo })
                            }
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={esYoMismo}
                            className="text-destructive focus:text-destructive"
                            onClick={() => setEliminar(u)}
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

      <UsuarioFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        usuario={editando}
        onGuardado={() =>
          queryClient.invalidateQueries({ queryKey: ['usuarios'] })
        }
      />

      <ConfirmDialog
        open={eliminar !== null}
        onOpenChange={(v) => !v && setEliminar(null)}
        title="Eliminar usuario"
        description={
          eliminar
            ? `¿Eliminar a ${eliminar.nombre}? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (eliminar) await eliminarMut.mutateAsync(eliminar.id);
        }}
      />
    </div>
  );
}

interface FormState {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo: boolean;
}

function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
  onGuardado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
  onGuardado: () => void;
}) {
  const esEdicion = usuario !== null;
  const [form, setForm] = useState<FormState>(() => inicial(usuario));
  // Reinicia el form cada vez que se abre (con el usuario en edición o vacío).
  const [keyAbierto, setKeyAbierto] = useState(false);
  if (open !== keyAbierto) {
    setKeyAbierto(open);
    if (open) setForm(inicial(usuario));
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (esEdicion && usuario) {
        const payload: Record<string, unknown> = {
          nombre: form.nombre,
          rol: form.rol,
          activo: form.activo,
        };
        if (form.password.trim()) payload.password = form.password;
        await api.patch(`/usuarios/${usuario.id}`, payload);
      } else {
        await api.post('/usuarios', {
          nombre: form.nombre,
          email: form.email,
          password: form.password,
          rol: form.rol,
        });
      }
    },
    onSuccess: () => {
      toast.success(esEdicion ? 'Usuario actualizado' : 'Usuario creado');
      onGuardado();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    guardar.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {esEdicion
              ? 'Actualiza los datos de la cuenta. Deja la contraseña vacía para no cambiarla.'
              : 'Crea una cuenta de administrador o monitorista.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              disabled={esEdicion}
            />
            {esEdicion ? (
              <p className="text-xs text-muted-foreground">
                El correo no se puede cambiar.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.rol} onValueChange={(v) => set('rol', v as Rol)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONITORISTA">Monitorista</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {esEdicion ? (
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.activo ? 'activo' : 'inactivo'}
                  onValueChange={(v) => set('activo', v === 'activo')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required={!esEdicion}
              minLength={8}
              placeholder={esEdicion ? 'Dejar vacío para no cambiar' : undefined}
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function inicial(usuario: Usuario | null): FormState {
  return {
    nombre: usuario?.nombre ?? '',
    email: usuario?.email ?? '',
    password: '',
    rol: usuario?.rol ?? 'MONITORISTA',
    activo: usuario?.activo ?? true,
  };
}
