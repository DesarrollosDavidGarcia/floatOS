import { TipoDocumentoConductor } from '@flotaos/shared-types';

/** Lógica de vencimiento centralizada (regla escalonada única). */
export { vencimientoInfo } from '@/lib/vencimiento';
export type { VencimientoInfo } from '@/lib/vencimiento';

export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumentoConductor, string> = {
  [TipoDocumentoConductor.LICENCIA_FEDERAL]: 'Licencia federal',
  [TipoDocumentoConductor.EXAMEN_MEDICO]: 'Examen médico',
  [TipoDocumentoConductor.INE]: 'INE',
  [TipoDocumentoConductor.CURP]: 'CURP',
  [TipoDocumentoConductor.RFC]: 'RFC',
  [TipoDocumentoConductor.COMPROBANTE_DOMICILIO]: 'Comprobante de domicilio',
  [TipoDocumentoConductor.CONSTANCIA_SITUACION_FISCAL]: 'Constancia de situación fiscal',
  [TipoDocumentoConductor.CONTRATO]: 'Contrato',
  [TipoDocumentoConductor.ALTA_IMSS]: 'Alta IMSS',
  [TipoDocumentoConductor.OTRO]: 'Otro',
};
