'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Campo,
  ExpedienteFormDialog,
} from '@/components/conductores/expediente/form-ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EscalaViaje, PasajeroViaje } from './types';

const SIN_PARADA = '__sin__';

interface FilaPasajero {
  nombre: string;
  identificacion: string;
  telefono: string;
  escalaId: string;
}

function etiquetaParada(orden: number, total: number): string {
  if (orden === 0) return 'Origen';
  if (orden === total - 1) return 'Destino';
  return `Parada ${orden}`;
}

function vacia(): FilaPasajero {
  return { nombre: '', identificacion: '', telefono: '', escalaId: SIN_PARADA };
}

/**
 * Botón + diálogo para gestionar el manifiesto de pasajeros de un viaje de
 * personal. Reemplaza la lista completa al guardar (PUT). Cada pasajero puede
 * indicar en qué parada sube.
 */
export function ManifiestoDialog({
  viajeId,
  pasajeros,
  escalas,
}: {
  viajeId: string;
  pasajeros: PasajeroViaje[];
  escalas: EscalaViaje[];
}) {
  const [open, setOpen] = useState(false);
  const [filas, setFilas] = useState<FilaPasajero[]>([]);
  const qc = useQueryClient();

  function abrir() {
    setFilas(
      pasajeros.length
        ? pasajeros.map((p) => ({
            nombre: p.nombre,
            identificacion: p.identificacion ?? '',
            telefono: p.telefono ?? '',
            escalaId: p.escalaId ?? SIN_PARADA,
          }))
        : [vacia()],
    );
    setOpen(true);
  }

  function actualizar(i: number, campo: keyof FilaPasajero, valor: string) {
    setFilas((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)),
    );
  }

  const conNombre = filas.filter((f) => f.nombre.trim().length > 0);

  const guardar = useMutation({
    mutationFn: async () => {
      await api.put(`/viajes/${viajeId}/pasajeros`, {
        pasajeros: conNombre.map((f) => ({
          nombre: f.nombre.trim(),
          identificacion: f.identificacion.trim() || undefined,
          telefono: f.telefono.trim() || undefined,
          escalaId:
            f.escalaId && f.escalaId !== SIN_PARADA ? f.escalaId : undefined,
        })),
      });
    },
    onSuccess: () => {
      toast.success('Manifiesto actualizado');
      qc.invalidateQueries({ queryKey: ['viaje', viajeId] });
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    guardar.mutate();
  }

  const total = escalas.length;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={abrir}>
        <Users className="h-4 w-4" />
        Gestionar pasajeros
      </Button>

      <ExpedienteFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Manifiesto de pasajeros"
        description="Lista de personas a transportar. Reemplaza el manifiesto al guardar."
        onSubmit={onSubmit}
        saving={guardar.isPending}
        size="xl"
      >
        <div className="space-y-3">
          {filas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin pasajeros. Agrega al menos uno.
            </p>
          ) : (
            filas.map((f, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto]"
              >
                <Campo label="Nombre" htmlFor={`p-${i}-n`} required>
                  <Input
                    id={`p-${i}-n`}
                    value={f.nombre}
                    onChange={(e) => actualizar(i, 'nombre', e.target.value)}
                    placeholder="Nombre completo"
                  />
                </Campo>
                <Campo label="Identificación" htmlFor={`p-${i}-id`}>
                  <Input
                    id={`p-${i}-id`}
                    value={f.identificacion}
                    onChange={(e) =>
                      actualizar(i, 'identificacion', e.target.value)
                    }
                    placeholder="Nº empleado / ID"
                  />
                </Campo>
                <Campo label="Celular" htmlFor={`p-${i}-t`}>
                  <Input
                    id={`p-${i}-t`}
                    value={f.telefono}
                    onChange={(e) => actualizar(i, 'telefono', e.target.value)}
                    placeholder="Opcional"
                  />
                </Campo>
                <Campo label="Sube en" htmlFor={`p-${i}-e`}>
                  <Select
                    value={f.escalaId}
                    onValueChange={(v) => actualizar(i, 'escalaId', v)}
                  >
                    <SelectTrigger id={`p-${i}-e`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_PARADA}>Sin especificar</SelectItem>
                      {escalas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {etiquetaParada(e.orden, total)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setFilas((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label="Quitar pasajero"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilas((prev) => [...prev, vacia()])}
          >
            <Plus className="h-4 w-4" />
            Agregar pasajero
          </Button>
        </div>
      </ExpedienteFormDialog>
    </>
  );
}
