import { TipoDocumentoConductor } from '@flotaos/shared-types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

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

export interface VencimientoInfo {
  label: string;
  variant: BadgeVariant;
  /** Días restantes (negativo si ya venció). */
  dias: number;
}

/** Calcula el estado de vencimiento de un documento a partir de su fecha (ISO). */
export function vencimientoInfo(fechaVencimiento: string): VencimientoInfo {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  venc.setHours(0, 0, 0, 0);
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);

  if (dias < 0) {
    return {
      label: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`,
      variant: 'destructive',
      dias,
    };
  }
  if (dias === 0) return { label: 'Vence hoy', variant: 'destructive', dias };
  if (dias <= 30) {
    return {
      label: `Vence en ${dias} día${dias === 1 ? '' : 's'}`,
      variant: 'warning',
      dias,
    };
  }
  return { label: 'Vigente', variant: 'success', dias };
}
