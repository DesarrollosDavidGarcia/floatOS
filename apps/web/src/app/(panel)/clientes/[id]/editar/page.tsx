'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ClienteFormPage } from '@/components/clientes/form/cliente-form-page';
import type { Cliente } from '@/app/(panel)/clientes/tipos';

export default function EditarClientePage() {
  const params = useParams();
  const id = String(params.id);

  const { data, isLoading, isError } = useQuery<Cliente>({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data } = await api.get<Cliente>(`/clientes/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando cliente…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">No se pudo cargar el cliente.</p>;
  }

  return <ClienteFormPage mode="editar" cliente={data} />;
}
