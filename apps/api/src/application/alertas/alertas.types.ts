/** Una fila del centro de alertas: documento por vencer. */
export interface AlertaVencimiento {
  /** Tipo de entidad dueña del documento. */
  tipo: 'unidad' | 'conductor';
  /** Identificador legible: placas de la unidad o nombre del conductor. */
  entidad: string;
  /**
   * Tipo de documento. Valores de los enums TipoDocumentoUnidad /
   * TipoDocumentoConductor (mismos valores en Prisma y en shared-types).
   */
  tipoDocumento: string;
  /** Fecha de vencimiento del documento. */
  fechaVencimiento: Date;
  /** Días calendario (UTC) restantes hasta el vencimiento. Puede ser 0. */
  diasRestantes: number;
}
