'use client';

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
    />
  );
}
