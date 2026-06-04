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
