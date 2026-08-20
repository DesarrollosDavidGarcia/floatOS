'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import { formatearMoneda } from '@/lib/estado-cotizacion';
import { fechaHora } from '@/lib/fecha';

interface Gasto {
  id: string;
  tipo: string;
  monto: number | string;
  descripcion: string | null;
  litros: number | string | null;
  precioPorLitro: number | string | null;
  fotoTicketUrl: string | null;
  createdAt: string;
}

/**
 * Gastos del viaje. El combustible capturado aquí manda sobre la estimación por
 * rendimiento en el cálculo del margen, y las casetas y viáticos son costo que
 * de otro modo no se contaría en absoluto.
 */
export function GastosCard({ viajeId }: { viajeId: string }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState('COMBUSTIBLE');
  const [monto, setMonto] = useState('');
  const [litros, setLitros] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ticket, setTicket] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['viaje-gastos', viajeId],
    queryFn: async () => {
      const { data } = await api.get<Gasto[]>(`/viajes/${viajeId}/gastos`);
      return data;
    },
  });

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['viaje-gastos', viajeId] });
    // El margen cambia con cada gasto: el combustible pasa de estimado a real.
    void qc.invalidateQueries({ queryKey: ['viaje', viajeId, 'margen'] });
  };

  const agregar = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Gasto>(`/viajes/${viajeId}/gastos`, {
        tipo,
        monto: Number(monto),
        descripcion: descripcion.trim() || undefined,
        litros: tipo === 'COMBUSTIBLE' && litros ? Number(litros) : undefined,
      });
      if (ticket) {
        const fd = new FormData();
        fd.append('ticket', ticket);
        await api.post(`/viajes/gastos/${data.id}/ticket`, fd, {
          headers: { 'Content-Type': undefined },
        });
      }
    },
    onSuccess: () => {
      toast.success('Gasto agregado');
      setMonto('');
      setLitros('');
      setDescripcion('');
      setTicket(null);
      setError(null);
      invalidar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/viajes/gastos/${id}`);
    },
    onSuccess: () => {
      toast.success('Gasto eliminado');
      invalidar();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const enviar = () => {
    if (!monto || Number(monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    setError(null);
    agregar.mutate();
  };

  const gastos = data ?? [];
  const total = gastos.reduce((t, g) => t + Number(g.monto), 0);

  return (
    <div className="space-y-4">
      <CamposGrid cols={3}>
        <Campo label="Tipo">
          <CatalogoSelect
            grupo="TIPO_GASTO"
            value={tipo}
            onChange={(c) => setTipo(c)}
            placeholder="Selecciona…"
            ariaLabel="Tipo de gasto"
          />
        </Campo>
        <Campo label="Monto" htmlFor="monto" error={error ?? undefined}>
          <Input
            id="monto"
            inputMode="decimal"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </Campo>
        {tipo === 'COMBUSTIBLE' ? (
          <Campo label="Litros" htmlFor="litros" hint="Opcional, del ticket.">
            <Input
              id="litros"
              inputMode="decimal"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
            />
          </Campo>
        ) : (
          <Campo label="Descripción" htmlFor="descripcion">
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Campo>
        )}
        <Campo label="Ticket" htmlFor="ticket">
          <Input
            id="ticket"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setTicket(e.target.files?.[0] ?? null)}
          />
        </Campo>
        <div className="flex items-end">
          <Button type="button" onClick={enviar} disabled={agregar.isPending}>
            {agregar.isPending ? 'Agregando…' : 'Agregar gasto'}
          </Button>
        </div>
      </CamposGrid>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : gastos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin gastos capturados. Mientras no los haya, el combustible del viaje se
          estima por rendimiento y las casetas no se cuentan.
        </p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {gastos.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">
                  <CatalogoTexto grupo="TIPO_GASTO" codigo={g.tipo} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {fechaHora(g.createdAt)}
                  {g.litros ? ` · ${Number(g.litros)} L` : ''}
                  {g.descripcion ? ` · ${g.descripcion}` : ''}
                </p>
                {g.fotoTicketUrl && (
                  <a
                    href={g.fotoTicketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Ver ticket
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="tabular-nums">{formatearMoneda(g.monto)}</span>
                <ConfirmDialog
                  title="¿Eliminar este gasto?"
                  description="El costo del viaje bajará en ese monto y su ticket se borrará."
                  confirmLabel="Eliminar"
                  onConfirm={() => eliminar.mutateAsync(g.id)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Eliminar gasto">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 font-medium">
            <span>Total capturado</span>
            <span className="tabular-nums">{formatearMoneda(total)}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
