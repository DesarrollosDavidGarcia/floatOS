'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { formatearMoneda } from '@/lib/estado-cotizacion';

interface ConceptoCosto {
  id: string;
  concepto: string;
  costo: number;
  vidaUtilKm: number;
  notas: string | null;
  costoPorKm: number;
}

interface CostosUnidad {
  conceptos: ConceptoCosto[];
  totalPorKm: number;
}

const kmFormat = new Intl.NumberFormat('es-MX');

/**
 * Costo de operación por kilómetro, armado por conceptos (llantas, servicios,
 * frenos…) con lo que cuesta cada uno y los km que dura.
 *
 * Se captura así, y no como un solo número, porque el $/km no se sabe de
 * memoria pero el precio de un juego de llantas y lo que dura sí. Además deja
 * revisar de dónde sale cada centavo y corregir solo la línea que cambió.
 */
export function CostosUnidadCard({ unidadId }: { unidadId: string }) {
  const qc = useQueryClient();
  const [concepto, setConcepto] = useState('');
  const [costo, setCosto] = useState('');
  const [vida, setVida] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['unidad-costos', unidadId],
    queryFn: async () => {
      const { data } = await api.get<CostosUnidad>(`/unidades/${unidadId}/costos`);
      return data;
    },
  });

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['unidad-costos', unidadId] });
  };

  const agregar = useMutation({
    mutationFn: async () => {
      await api.post(`/unidades/${unidadId}/costos`, {
        concepto: concepto.trim(),
        costo: Number(costo),
        vidaUtilKm: Number(vida),
      });
    },
    onSuccess: () => {
      toast.success('Concepto agregado');
      setConcepto('');
      setCosto('');
      setVida('');
      setError(null);
      invalidar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/unidades/costos/${id}`);
    },
    onSuccess: () => {
      toast.success('Concepto eliminado');
      invalidar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const enviar = () => {
    if (!concepto.trim()) return setError('Ponle nombre al concepto');
    if (!costo || Number(costo) <= 0) return setError('El costo debe ser mayor a 0');
    if (!vida || Number(vida) <= 0) return setError('Los km de duración deben ser mayores a 0');
    setError(null);
    agregar.mutate();
  };

  const conceptos = data?.conceptos ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Captura lo que cuesta cada cosa y cuántos kilómetros dura. La suma es lo
        que se le carga a cada viaje de esta unidad, sin contar el diesel: el
        combustible se calcula aparte con el rendimiento y el precio por litro.
      </p>

      <CamposGrid cols={3}>
        <Campo label="Concepto" htmlFor="concepto" error={error ?? undefined}>
          <Input
            id="concepto"
            placeholder="Llantas, servicio mayor…"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
          />
        </Campo>
        <Campo label="Costo" htmlFor="costo">
          <Input
            id="costo"
            inputMode="decimal"
            placeholder="0.00"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
          />
        </Campo>
        <Campo label="Dura (km)" htmlFor="vidaUtilKm">
          <Input
            id="vidaUtilKm"
            inputMode="numeric"
            placeholder="60000"
            value={vida}
            onChange={(e) => setVida(e.target.value)}
          />
        </Campo>
        <div className="flex items-end">
          <Button type="button" onClick={enviar} disabled={agregar.isPending}>
            {agregar.isPending ? 'Agregando…' : 'Agregar'}
          </Button>
        </div>
      </CamposGrid>

      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : conceptos.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Sin conceptos capturados. Mientras tanto el margen usa el costo por km
          manual de la unidad, si lo tiene; si no, no cobra mantenimiento y lo
          reporta como dato faltante.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Concepto</th>
                <th className="py-2 text-right font-medium">Costo</th>
                <th className="py-2 text-right font-medium">Dura</th>
                <th className="py-2 text-right font-medium">$/km</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {conceptos.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{c.concepto}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatearMoneda(c.costo)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {kmFormat.format(c.vidaUtilKm)} km
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {formatearMoneda(c.costoPorKm)}
                  </td>
                  <td className="py-2 text-right">
                    <ConfirmDialog
                      title="¿Eliminar este concepto?"
                      description="El costo por km de la unidad bajará en esa cantidad."
                      confirmLabel="Eliminar"
                      onConfirm={() => eliminar.mutateAsync(c.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Eliminar ${c.concepto}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-2 text-right text-sm font-medium">
                  Costo de operación por km
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {formatearMoneda(data?.totalPorKm ?? 0)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
