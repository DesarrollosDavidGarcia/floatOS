'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { formatearMoneda } from '@/lib/estado-cotizacion';
import { fechaCorta } from '@/lib/fecha';
import type { Paginado } from '@flotaos/shared-types';

interface PrecioDiesel {
  id: string;
  /** Decimal de Prisma: llega como string en el JSON. */
  precioPorLitro: number | string;
  vigenteDesde: string;
  notas?: string | null;
}

/** Fecha de hoy en formato de <input type="date"> (hora local, sin corrimiento). */
function hoy(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Historial del precio del diesel. Se usa para estimar el combustible de un
 * viaje cuando el conductor no capturó litros: manda el precio con la vigencia
 * más reciente que no sea posterior a la fecha del viaje.
 */
export function PreciosDieselCard() {
  const qc = useQueryClient();
  const [precio, setPrecio] = useState('');
  const [desde, setDesde] = useState(hoy());
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['precios-diesel'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<PrecioDiesel>>('/precios-diesel');
      return data;
    },
  });

  const agregar = useMutation({
    mutationFn: async () => {
      await api.post('/precios-diesel', {
        precioPorLitro: Number(precio),
        // El input da 'YYYY-MM-DD'; el backend espera ISO.
        vigenteDesde: new Date(`${desde}T00:00:00`).toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Precio agregado');
      setPrecio('');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['precios-diesel'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/precios-diesel/${id}`);
    },
    onSuccess: () => {
      toast.success('Precio eliminado');
      void qc.invalidateQueries({ queryKey: ['precios-diesel'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const enviar = () => {
    const n = Number(precio);
    if (!precio || Number.isNaN(n) || n <= 0) {
      setError('Captura un precio mayor a 0');
      return;
    }
    if (!desde) {
      setError('Indica desde cuándo rige');
      return;
    }
    setError(null);
    agregar.mutate();
  };

  const precios = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Precio del diesel</CardTitle>
        <CardDescription>
          Lo que cuesta el litro, con la fecha desde la que rige. Sirve para
          estimar el combustible de un viaje cuando no hay ticket con litros
          capturados; si lo hay, manda el ticket. No es lo mismo que el precio de
          diesel de las tarifas de cotización, que sirve para cobrarle al cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CamposGrid cols={3}>
          <Campo label="Precio por litro" htmlFor="precioPorLitro" error={error ?? undefined}>
            <Input
              id="precioPorLitro"
              inputMode="decimal"
              placeholder="0.000"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </Campo>
          <Campo label="Vigente desde" htmlFor="vigenteDesde">
            <Input
              id="vigenteDesde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </Campo>
          <div className="flex items-end">
            <Button type="button" onClick={enviar} disabled={agregar.isPending}>
              {agregar.isPending ? 'Agregando…' : 'Agregar precio'}
            </Button>
          </div>
        </CamposGrid>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : precios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay precios cargados. Sin al menos uno, el combustible de
            los viajes sin ticket no se puede estimar.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {precios.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {formatearMoneda(p.precioPorLitro)} / L
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    desde el {fechaCorta(p.vigenteDesde)}
                  </span>
                  {/* El listado viene de más reciente a más antiguo. */}
                  {i === 0 && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                      vigente
                    </span>
                  )}
                </div>
                <ConfirmDialog
                  title="¿Eliminar este precio?"
                  description="Los viajes de ese periodo pasarán a estimarse con el precio anterior."
                  confirmLabel="Eliminar"
                  onConfirm={() => eliminar.mutateAsync(p.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar el precio vigente desde ${fechaCorta(p.vigenteDesde)}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
