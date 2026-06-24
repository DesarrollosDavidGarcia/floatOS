'use client';

import { api } from '@/lib/api';
import { DocumentosDialogBase } from '@/components/documentos/documentos-dialog-base';
import type { DocumentoUnidad, Unidad } from './types';

export function DocumentosDialog({
  unidad,
  open,
  onOpenChange,
}: {
  unidad: Unidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DocumentosDialogBase<DocumentoUnidad>
      open={open}
      onOpenChange={onOpenChange}
      subtitulo={unidad?.placas}
      descripcion="Gestiona los documentos de la unidad y su vigencia."
      entidadId={unidad?.id}
      basePath={(id) => `/unidades/${id}/documentos`}
      queryKey={(id) => ['unidad-documentos', id]}
      invalidarAdicional={[['unidad-documentos-por-vencer']]}
      catalogoGrupo="TIPO_DOCUMENTO_UNIDAD"
      campoExtra={{ name: 'descripcion', label: 'Descripción' }}
      guardarArchivoIa={
        unidad
          ? async (file) => {
              // La unidad no tiene adjuntos por documento: se guarda en su área
              // general de archivos (categoría GENERAL).
              const fd = new FormData();
              fd.append('archivos', file);
              await api.post(
                `/unidades/${unidad.id}/archivos?categoria=GENERAL`,
                fd,
                { headers: { 'Content-Type': undefined } },
              );
            }
          : undefined
      }
    />
  );
}
