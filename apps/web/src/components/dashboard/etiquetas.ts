import { TipoDocumentoConductor, TipoDocumentoUnidad } from '@flotaos/shared-types';

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

/** Variante de badge según la urgencia (días restantes). */
export function urgenciaBadge(diasRestantes: number): 'destructive' | 'warning' | 'secondary' {
  if (diasRestantes <= 7) return 'destructive';
  if (diasRestantes <= 15) return 'warning';
  return 'secondary';
}
