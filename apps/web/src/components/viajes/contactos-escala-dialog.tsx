'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { esEmail } from '@/lib/validacion';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Campo,
  ExpedienteFormDialog,
} from '@/components/conductores/expediente/form-ui';
import type { ContactoEscala } from './types';

interface FilaContacto {
  nombre: string;
  email: string;
  telefono: string;
}

/** Contacto del cliente usado como sugerencia de autocompletado. */
interface ContactoClienteSugerencia {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
}

function aFila(c: ContactoEscala): FilaContacto {
  return {
    nombre: c.nombre ?? '',
    email: c.email ?? '',
    telefono: c.telefono ?? '',
  };
}

/**
 * Botón + diálogo para gestionar las personas a cargo de una escala (reciben el
 * aviso de llegada por email). Reemplaza la lista completa al guardar. Solo debe
 * mostrarse cuando el viaje tiene una cotización aceptada.
 */
export function ContactosEscalaDialog({
  viajeId,
  escalaId,
  clienteId,
  direccion,
  contactos,
}: {
  viajeId: string;
  escalaId: string;
  clienteId?: string | null;
  direccion: string;
  contactos: ContactoEscala[];
}) {
  const [open, setOpen] = useState(false);
  const [filas, setFilas] = useState<FilaContacto[]>([]);
  const [tocado, setTocado] = useState(false);
  const qc = useQueryClient();

  // Sugerencias: los contactos ya registrados del cliente del viaje.
  const { data: sugerencias } = useQuery({
    queryKey: ['cliente-contactos', clienteId],
    queryFn: async () => {
      const { data } = await api.get<{ contactos?: ContactoClienteSugerencia[] }>(
        `/clientes/${clienteId}`,
      );
      return data.contactos ?? [];
    },
    enabled: open && Boolean(clienteId),
    staleTime: 60_000,
  });

  function abrir() {
    setFilas(contactos.length ? contactos.map(aFila) : [{ nombre: '', email: '', telefono: '' }]);
    setTocado(false);
    setOpen(true);
  }

  function actualizar(i: number, campo: keyof FilaContacto, valor: string) {
    setFilas((prev) =>
      prev.map((f, idx) => {
        if (idx !== i) return f;
        const next = { ...f, [campo]: valor };
        // Al elegir un nombre conocido del cliente, autocompleta email/celular vacíos.
        if (campo === 'nombre') {
          const sug = (sugerencias ?? []).find((s) => s.nombre === valor);
          if (sug) {
            if (!next.email && sug.email) next.email = sug.email;
            if (!next.telefono && sug.telefono) next.telefono = sug.telefono;
          }
        }
        return next;
      }),
    );
  }

  function agregar() {
    setFilas((prev) => [...prev, { nombre: '', email: '', telefono: '' }]);
  }

  function quitar(i: number) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Solo cuentan las filas con nombre; el email, si viene, debe ser válido.
  const conNombre = filas.filter((f) => f.nombre.trim().length > 0);
  const emailInvalido = conNombre.some(
    (f) => f.email.trim().length > 0 && !esEmail(f.email),
  );

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        contactos: conNombre.map((f) => ({
          nombre: f.nombre.trim(),
          email: f.email.trim() || undefined,
          telefono: f.telefono.trim() || undefined,
        })),
      };
      await api.put(`/viajes/${viajeId}/escalas/${escalaId}/contactos`, payload);
    },
    onSuccess: () => {
      toast.success('Contactos actualizados');
      qc.invalidateQueries({ queryKey: ['viaje', viajeId] });
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTocado(true);
    if (emailInvalido) return;
    guardar.mutate();
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={abrir}>
        <Users className="h-3.5 w-3.5" />
        {contactos.length ? `Avisar a (${contactos.length})` : 'Avisar a alguien'}
      </Button>

      <ExpedienteFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Personas a cargo de la parada"
        description={`Reciben un email cuando el transportista llega a "${direccion}".`}
        onSubmit={onSubmit}
        saving={guardar.isPending}
        size="lg"
      >
        <div className="space-y-3">
          {/* Sugerencias de autocompletado desde los contactos del cliente. */}
          {(sugerencias?.length ?? 0) > 0 && (
            <datalist id="sug-contacto-nombre">
              {sugerencias!.map((s, idx) => (
                <option key={idx} value={s.nombre} />
              ))}
            </datalist>
          )}
          {filas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin contactos. Agrega al menos uno para avisar de la llegada.
            </p>
          ) : (
            filas.map((f, i) => {
              const emailMal =
                tocado &&
                f.nombre.trim().length > 0 &&
                f.email.trim().length > 0 &&
                !esEmail(f.email);
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <Campo label="Nombre" htmlFor={`c-${i}-nombre`} required>
                    <Input
                      id={`c-${i}-nombre`}
                      list="sug-contacto-nombre"
                      value={f.nombre}
                      onChange={(e) => actualizar(i, 'nombre', e.target.value)}
                      placeholder="Nombre"
                    />
                  </Campo>
                  <Campo label="Email" htmlFor={`c-${i}-email`} error={emailMal ? 'Email no válido' : undefined}>
                    <Input
                      id={`c-${i}-email`}
                      type="email"
                      value={f.email}
                      onChange={(e) => actualizar(i, 'email', e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </Campo>
                  <Campo label="Celular" htmlFor={`c-${i}-tel`}>
                    <Input
                      id={`c-${i}-tel`}
                      value={f.telefono}
                      onChange={(e) => actualizar(i, 'telefono', e.target.value)}
                      placeholder="Opcional"
                    />
                  </Campo>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => quitar(i)}
                      aria-label="Quitar contacto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <Button type="button" variant="outline" size="sm" onClick={agregar}>
            <Plus className="h-4 w-4" />
            Agregar contacto
          </Button>

          <p className="text-xs text-muted-foreground">
            El aviso se envía por email al detectar la llegada. El celular se guarda,
            pero el SMS aún no está disponible.
          </p>
        </div>
      </ExpedienteFormDialog>
    </>
  );
}
