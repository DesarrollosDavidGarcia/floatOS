// Tipos y enums compartidos entre la API (NestJS) y el panel web (Next.js).
// Reflejan los enums del schema Prisma — mantener sincronizados.

export enum EstadoViaje {
  ASIGNADO = 'ASIGNADO',
  ACEPTADO = 'ACEPTADO',
  EN_CAMINO_ORIGEN = 'EN_CAMINO_ORIGEN',
  CARGANDO = 'CARGANDO',
  EN_TRANSITO = 'EN_TRANSITO',
  ENTREGADO = 'ENTREGADO',
  FACTURADO = 'FACTURADO',
  CANCELADO = 'CANCELADO',
}

/** Transiciones válidas del ciclo de vida de un viaje (MVP). */
export const TRANSICIONES_VIAJE: Record<EstadoViaje, EstadoViaje[]> = {
  [EstadoViaje.ASIGNADO]: [EstadoViaje.ACEPTADO, EstadoViaje.CANCELADO],
  [EstadoViaje.ACEPTADO]: [EstadoViaje.EN_CAMINO_ORIGEN, EstadoViaje.CANCELADO],
  [EstadoViaje.EN_CAMINO_ORIGEN]: [EstadoViaje.CARGANDO, EstadoViaje.CANCELADO],
  [EstadoViaje.CARGANDO]: [EstadoViaje.EN_TRANSITO, EstadoViaje.CANCELADO],
  [EstadoViaje.EN_TRANSITO]: [EstadoViaje.ENTREGADO, EstadoViaje.CANCELADO],
  [EstadoViaje.ENTREGADO]: [EstadoViaje.FACTURADO],
  [EstadoViaje.FACTURADO]: [],
  [EstadoViaje.CANCELADO]: [],
};

export enum TipoDocumentoUnidad {
  VERIFICACION = 'VERIFICACION',
  SEGURO = 'SEGURO',
  TARJETA_CIRCULACION = 'TARJETA_CIRCULACION',
  OTRO = 'OTRO',
}

export enum TipoDocumentoConductor {
  LICENCIA_FEDERAL = 'LICENCIA_FEDERAL',
  EXAMEN_MEDICO = 'EXAMEN_MEDICO',
  INE = 'INE',
  CURP = 'CURP',
  RFC = 'RFC',
  COMPROBANTE_DOMICILIO = 'COMPROBANTE_DOMICILIO',
  CONSTANCIA_SITUACION_FISCAL = 'CONSTANCIA_SITUACION_FISCAL',
  CONTRATO = 'CONTRATO',
  ALTA_IMSS = 'ALTA_IMSS',
  OTRO = 'OTRO',
}

// ── Expediente del conductor ──

/** Categoría de la Licencia Federal de Conductor (SCT). */
export enum CategoriaLicencia {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

export enum TipoExamenMedico {
  APTITUD_PSICOFISICA = 'APTITUD_PSICOFISICA',
  ANTIDOPING = 'ANTIDOPING',
  EXAMEN_GENERAL = 'EXAMEN_GENERAL',
  VISTA = 'VISTA',
  AUDITIVO = 'AUDITIVO',
  OTRO = 'OTRO',
}

export enum ResultadoExamen {
  APTO = 'APTO',
  NO_APTO = 'NO_APTO',
  CONDICIONADO = 'CONDICIONADO',
  PENDIENTE = 'PENDIENTE',
}

export enum TipoCertificacion {
  MATERIALES_PELIGROSOS = 'MATERIALES_PELIGROSOS',
  RESIDUOS_PELIGROSOS = 'RESIDUOS_PELIGROSOS',
  MANEJO_DEFENSIVO = 'MANEJO_DEFENSIVO',
  PRIMEROS_AUXILIOS = 'PRIMEROS_AUXILIOS',
  CAAT = 'CAAT',
  MERCANCIAS_PELIGROSAS_SCT = 'MERCANCIAS_PELIGROSAS_SCT',
  OTRO = 'OTRO',
}

export enum TipoIncidencia {
  ACCIDENTE = 'ACCIDENTE',
  INFRACCION = 'INFRACCION',
  SANCION = 'SANCION',
  FALTA = 'FALTA',
  QUEJA = 'QUEJA',
  RECONOCIMIENTO = 'RECONOCIMIENTO',
  OTRO = 'OTRO',
}

export enum GravedadIncidencia {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export enum TipoEventoLaboral {
  INGRESO = 'INGRESO',
  ASCENSO = 'ASCENSO',
  CAMBIO_PUESTO = 'CAMBIO_PUESTO',
  CAMBIO_SALARIO = 'CAMBIO_SALARIO',
  AMONESTACION = 'AMONESTACION',
  RECONOCIMIENTO = 'RECONOCIMIENTO',
  BAJA = 'BAJA',
  OTRO = 'OTRO',
}

export enum NivelAptitud {
  PRINCIPIANTE = 'PRINCIPIANTE',
  INTERMEDIO = 'INTERMEDIO',
  EXPERTO = 'EXPERTO',
}

export enum TipoUnidadManejo {
  TRACTOCAMION = 'TRACTOCAMION',
  TORTON = 'TORTON',
  RABON = 'RABON',
  THORTON = 'THORTON',
  CAMION_3_5 = 'CAMION_3_5',
  CAMIONETA = 'CAMIONETA',
  CAJA_SECA = 'CAJA_SECA',
  CAJA_REFRIGERADA = 'CAJA_REFRIGERADA',
  PLATAFORMA = 'PLATAFORMA',
  TOLVA = 'TOLVA',
  PIPA = 'PIPA',
  FULL = 'FULL',
  OTRO = 'OTRO',
}

export enum TipoControlConfianza {
  EXAMEN_CONFIANZA = 'EXAMEN_CONFIANZA',
  ANTECEDENTES_NO_PENALES = 'ANTECEDENTES_NO_PENALES',
  ESTUDIO_SOCIOECONOMICO = 'ESTUDIO_SOCIOECONOMICO',
  POLIGRAFO = 'POLIGRAFO',
  TOXICOLOGICO = 'TOXICOLOGICO',
  OTRO = 'OTRO',
}

export enum TipoAusencia {
  INCAPACIDAD_IMSS = 'INCAPACIDAD_IMSS',
  VACACIONES = 'VACACIONES',
  PERMISO_CON_GOCE = 'PERMISO_CON_GOCE',
  PERMISO_SIN_GOCE = 'PERMISO_SIN_GOCE',
  FALTA_JUSTIFICADA = 'FALTA_JUSTIFICADA',
  FALTA_INJUSTIFICADA = 'FALTA_INJUSTIFICADA',
  OTRO = 'OTRO',
}

export enum TipoGasto {
  COMBUSTIBLE = 'COMBUSTIBLE',
  CASETA = 'CASETA',
  VIATICOS = 'VIATICOS',
  OTRO = 'OTRO',
}

export enum EstadoCartaPorte {
  BORRADOR = 'BORRADOR',
  PENDIENTE_TIMBRAR = 'PENDIENTE_TIMBRAR',
  TIMBRADO = 'TIMBRADO',
  CANCELADO = 'CANCELADO',
}

export enum EstadoFactura {
  BORRADOR = 'BORRADOR',
  ENVIADA = 'ENVIADA',
  PAGADA = 'PAGADA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
}

// ── Eventos de tiempo real (Socket.io) ──
export const WS_EVENTS = {
  UBICACION_ACTUALIZADA: 'ubicacion:actualizada',
  VIAJE_ESTADO_CAMBIADO: 'viaje:estado',
  ALERTA: 'alerta',
} as const;

// ── Paginación (contrato único para todos los listados de la API) ──
export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPaginas: number;
}

// ── Auth ──
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
