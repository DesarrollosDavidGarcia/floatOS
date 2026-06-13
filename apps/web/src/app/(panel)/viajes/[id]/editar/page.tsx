'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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

  return <ViajeFormPage mode="editar" viaje={data} />;
}
