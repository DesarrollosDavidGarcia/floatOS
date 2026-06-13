'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paperclip } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArchivosExpedienteDialog } from '@/components/conductores/expediente/archivos-expediente-dialog';

/**
 * Conteos de archivos por registro de una sección del expediente. Se consulta
 * una sola vez por pestaña y se pasa cada conteo al botón correspondiente.
 */
export function useConteosArchivosExpediente(conductorId: string, seccion: string) {
  return useQuery({
    queryKey: ['conductor-expediente-conteos', conductorId, seccion],
    queryFn: async () =>
      (
        await api.get<Record<string, number>>(
          `/conductores/${conductorId}/expediente/${seccion}/archivos/conteos`,
        )
      ).data,
    enabled: Boolean(conductorId),
  });
}

/**
 * Botón "📎 N" que abre el diálogo de archivos de evidencia de un registro del
 * expediente. Reutilizable en todas las pestañas (médico, certificaciones, etc.).
 */
export function ArchivosExpedienteButton({
  conductorId,
  seccion,
  registroId,
  titulo,
  count,
}: {
  conductorId: string;
  seccion: string;
  registroId: string;
  titulo: string;
  count?: number;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => setAbierto(true)}
        title="Archivos de evidencia"
      >
        <Paperclip className="h-4 w-4" />
        {count ?? 0}
      </Button>
      {abierto && (
        <ArchivosExpedienteDialog
          conductorId={conductorId}
          seccion={seccion}
          registroId={registroId}
          titulo={titulo}
          open={abierto}
          onOpenChange={setAbierto}
        />
      )}
    </>
  );
}
