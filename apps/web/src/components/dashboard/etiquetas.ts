import { TipoDocumentoConductor, TipoDocumentoUnidad } from '@flotaos/shared-types';

// Urgencia según días restantes: regla escalonada única (lib/vencimiento).
export { variantePorDias as urgenciaBadge } from '@/lib/vencimiento';

/** Etiquetas legibles para los tipos de documento (unidad y conductor). */
const DOC_LABEL: Record<string, string> = {
  [TipoDocumentoUnidad.VERIFICACION]: 'Verificación',
  [TipoDocumentoUnidad.SEGURO]: 'Seguro',
  [TipoDocumentoUnidad.TARJETA_CIRCULACION]: 'Tarjeta de circulación',
  [TipoDocumentoConductor.LICENCIA_FEDERAL]: 'Licencia federal',
  [TipoDocumentoConductor.EXAMEN_MEDICO]: 'Examen médico',
  OTRO: 'Otro',
};

export function documentoLabel(tipoDocumento: string): string {
  return DOC_LABEL[tipoDocumento] ?? tipoDocumento;
}
