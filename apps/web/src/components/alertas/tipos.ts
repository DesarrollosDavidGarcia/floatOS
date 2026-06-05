import { TipoDocumentoUnidad, TipoDocumentoConductor } from '@flotaos/shared-types';

/** Tipo de entidad a la que pertenece un vencimiento. */
export type TipoEntidadVencimiento = 'unidad' | 'conductor';

/** Elemento devuelto por GET /alertas/vencimientos (array, no paginado). */
export interface VencimientoAlerta {
  tipo: TipoEntidadVencimiento;
  entidad: string;
  tipoDocumento: string;
  fechaVencimiento: string;
  diasRestantes: number;
}

/** Rangos de días disponibles para el filtro. */
export const RANGOS_DIAS = [7, 15, 30, 60] as const;
export type RangoDias = (typeof RANGOS_DIAS)[number];
export const RANGO_DIAS_DEFAULT: RangoDias = 30;

/** Etiquetas legibles para los tipos de documento conocidos. */
const DOCUMENTO_LABEL: Record<string, string> = {
  [TipoDocumentoUnidad.VERIFICACION]: 'Verificación',
  [TipoDocumentoUnidad.SEGURO]: 'Seguro',
  [TipoDocumentoUnidad.TARJETA_CIRCULACION]: 'Tarjeta de circulación',
  [TipoDocumentoConductor.LICENCIA_FEDERAL]: 'Licencia federal',
  [TipoDocumentoConductor.EXAMEN_MEDICO]: 'Examen médico',
  OTRO: 'Otro',
};

/** Convierte el código de documento en un texto legible (con fallback). */
export function etiquetaDocumento(tipoDocumento: string): string {
  if (DOCUMENTO_LABEL[tipoDocumento]) return DOCUMENTO_LABEL[tipoDocumento];
  // Fallback: convierte SNAKE_CASE en "Snake case".
  const texto = tipoDocumento.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Urgencia y texto de días restantes: regla escalonada única (lib/vencimiento).
export { variantePorDias, etiquetaDias as textoDiasRestantes } from '@/lib/vencimiento';
