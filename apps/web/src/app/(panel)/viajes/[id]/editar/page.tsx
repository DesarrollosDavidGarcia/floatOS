'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { ViajeFormPage } from '@/components/viajes/form/viaje-form-page';
import type { Viaje } from '@/components/viajes/types';

export default function EditarViajePage() {
  const params = useParams();
  const id = String(params.id);

  const { data, isLoading, isError } = useQuery<Viaje>({
    queryKey: ['viaje', id],
    queryFn: async () => {
      const { data } = await api.get<Viaje>(`/viajes/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando viaje…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">No se pudo cargar el viaje.</p>;
  }

  const tieneContactos = (data.escalas ?? []).some(
    (e) => (e.contactos?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-4">
      {tieneContactos && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Este viaje tiene <strong>personas a cargo</strong> en el itinerario.
            Al guardar, se conservan según la <strong>posición</strong> de cada
            parada; si eliminas o reordenas escalas, sus contactos pueden moverse
            de parada o perderse. Revísalos después de editar.
          </p>
        </div>
      )}
      <ViajeFormPage mode="editar" viaje={data} />
    </div>
  );
}
