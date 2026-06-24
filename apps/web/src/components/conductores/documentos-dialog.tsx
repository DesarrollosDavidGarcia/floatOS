'use client';

import { api } from '@/lib/api';
import { DocumentosDialogBase } from '@/components/documentos/documentos-dialog-base';
import type { Conductor, DocumentoConductor } from './types';

export function DocumentosDialog({
  conductor,
  open,
  onOpenChange,
}: {
  conductor: Conductor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const subtitulo = conductor
    ? `${conductor.nombre}${conductor.apellidos ? ` ${conductor.apellidos}` : ''}`
    : undefined;

  return (
    <DocumentosDialogBase<DocumentoConductor>
      open={open}
      onOpenChange={onOpenChange}
      subtitulo={subtitulo}
      entidadId={conductor?.id}
      basePath={(id) => `/conductores/${id}/documentos`}
      queryKey={(id) => ['conductor-documentos', id]}
      catalogoGrupo="TIPO_DOCUMENTO_CONDUCTOR"
      campoExtra={{ name: 'numero', label: 'Número' }}
      guardarArchivoIa={
        conductor
          ? async (file, docId) => {
              // Se adjunta al documento del conductor.
              const fd = new FormData();
              fd.append('archivos', file);
              await api.post(
                `/conductores/${conductor.id}/documentos/${docId}/archivos`,
                fd,
                { headers: { 'Content-Type': undefined } },
              );
            }
          : undefined
      }
    />
  );
}
