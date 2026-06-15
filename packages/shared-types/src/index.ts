// Tipos y enums compartidos entre la API (NestJS) y el panel web (Next.js).
// Reflejan los enums del schema Prisma — mantener sincronizados.

export enum EstadoViaje {
  ASIGNADO = 'ASIGNADO',
  ACEPTADO = 'ACEPTADO',
  EN_CAMINO_ORIGEN = 'EN_CAMINO_ORIGEN',
  CARGANDO = 'CARGANDO',
  EN_TRANSITO = 'EN_TRANSITO',
  VARADO = 'VARADO',
  ENTREGADO = 'ENTREGADO',
  FACTURADO = 'FACTURADO',
  CANCELADO = 'CANCELADO',
}

/**
 * Transiciones válidas del ciclo de vida de un viaje.
 * VARADO es una pausa recuperable por incidencia (avería/choque): se entra desde
 * cualquier estado en curso y se sale CANCELANDO o REANUDANDO (acción dedicada
 * `/viajes/:id/reanudar`, que vuelve al estado previo; por eso VARADO no lista
 * las transiciones de regreso aquí).
 */
export const TRANSICIONES_VIAJE: Record<EstadoViaje, EstadoViaje[]> = {
  [EstadoViaje.ASIGNADO]: [EstadoViaje.ACEPTADO, EstadoViaje.CANCELADO],
  [EstadoViaje.ACEPTADO]: [EstadoViaje.EN_CAMINO_ORIGEN, EstadoViaje.CANCELADO],
  [EstadoViaje.EN_CAMINO_ORIGEN]: [
    EstadoViaje.CARGANDO,
    EstadoViaje.VARADO,
    EstadoViaje.CANCELADO,
  ],
  [EstadoViaje.CARGANDO]: [
    EstadoViaje.EN_TRANSITO,
    EstadoViaje.VARADO,
    EstadoViaje.CANCELADO,
  ],
  [EstadoViaje.EN_TRANSITO]: [
    EstadoViaje.ENTREGADO,
    EstadoViaje.VARADO,
    EstadoViaje.CANCELADO,
  ],
  [EstadoViaje.VARADO]: [EstadoViaje.CANCELADO],
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
  AVERIA = 'AVERIA',
  ACCIDENTE = 'ACCIDENTE',
  PONCHADURA = 'PONCHADURA',
  INFRACCION = 'INFRACCION',
  SANCION = 'SANCION',
  FALTA = 'FALTA',
  QUEJA = 'QUEJA',
  RECONOCIMIENTO = 'RECONOCIMIENTO',
  OTRO = 'OTRO',
}

/** Tipos de incidencia que el conductor puede reportar en ruta desde la app. */
export const TIPOS_INCIDENCIA_CONDUCTOR = [
  'AVERIA',
  'ACCIDENTE',
  'PONCHADURA',
  'OTRO',
] as const;

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

// ── Catálogos (autoadministrables) ──
// Los campos de tipo/categoría guardan el `codigo` de un item del catálogo.
// Los estados con lógica (EstadoViaje/CartaPorte/Factura) NO son catálogo.

export interface CatalogoItem {
  id: string;
  grupo: string;
  codigo: string;
  nombre: string;
  orden: number;
  color: string | null;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogoGrupoMeta {
  /** Clave técnica del grupo (lo que se guarda en `CatalogoItem.grupo`). */
  grupo: string;
  /** Nombre visible del grupo en la pantalla de Catálogos. */
  nombre: string;
  /** Si true, sus items usan el campo `color` (badges configurables). */
  coloreable?: boolean;
}

/** Grupos de catálogo administrables desde el panel. */
export const CATALOGO_GRUPOS: CatalogoGrupoMeta[] = [
  { grupo: 'TIPO_DOCUMENTO_CONDUCTOR', nombre: 'Tipos de documento (conductor)' },
  { grupo: 'TIPO_DOCUMENTO_UNIDAD', nombre: 'Tipos de documento (unidad)' },
  { grupo: 'CATEGORIA_LICENCIA', nombre: 'Categorías de licencia' },
  { grupo: 'TIPO_EXAMEN_MEDICO', nombre: 'Tipos de examen médico' },
  { grupo: 'RESULTADO_EXAMEN', nombre: 'Resultados de examen', coloreable: true },
  { grupo: 'TIPO_CERTIFICACION', nombre: 'Tipos de certificación' },
  { grupo: 'TIPO_INCIDENCIA', nombre: 'Tipos de incidencia' },
  { grupo: 'GRAVEDAD_INCIDENCIA', nombre: 'Gravedad de incidencia', coloreable: true },
  { grupo: 'TIPO_EVENTO_LABORAL', nombre: 'Tipos de evento laboral' },
  { grupo: 'TIPO_UNIDAD_MANEJO', nombre: 'Tipos de unidad (aptitud)' },
  { grupo: 'NIVEL_APTITUD', nombre: 'Niveles de aptitud', coloreable: true },
  { grupo: 'TIPO_CONTROL_CONFIANZA', nombre: 'Tipos de control de confianza' },
  { grupo: 'TIPO_AUSENCIA', nombre: 'Tipos de ausencia' },
  { grupo: 'TIPO_GASTO', nombre: 'Tipos de gasto' },
  { grupo: 'TIPO_UNIDAD', nombre: 'Tipos de unidad (flota)' },
  { grupo: 'MARCA_UNIDAD', nombre: 'Marcas (flota)' },
  { grupo: 'MODELO_UNIDAD', nombre: 'Modelos (flota)' },
  { grupo: 'ASEGURADORA', nombre: 'Aseguradoras' },
  { grupo: 'PUESTO', nombre: 'Puestos' },
  { grupo: 'TIPO_SANGRE', nombre: 'Tipos de sangre' },
  { grupo: 'TIPO_CARGA', nombre: 'Tipos de carga' },
  { grupo: 'ACCION_ESCALA', nombre: 'Acciones de escala' },
  { grupo: 'SENTIDO_CARGA', nombre: 'Sentido de carga' },
];

export const CATALOGO_GRUPO_KEYS = CATALOGO_GRUPOS.map((g) => g.grupo);

// ── Eventos de tiempo real (Socket.io) ──
export const WS_EVENTS = {
  UBICACION_ACTUALIZADA: 'ubicacion:actualizada',
  VIAJE_ESTADO_CAMBIADO: 'viaje:estado',
  ALERTA: 'alerta',
  VIAJE_REASIGNADO: 'viaje:reasignado',
  INCIDENCIA_REPORTADA: 'incidencia:reportada',
} as const;

/** Payload del evento WS 'incidencia:reportada' (el conductor reporta un problema). */
export interface IncidenciaReportadaPayload {
  viajeId: string;
  folio: number | null;
  tipo: string;
  titulo: string;
  gravedad: string;
  descripcion: string | null;
  conductorNombre: string | null;
  /** true si el reporte además dejó el viaje en VARADO. */
  varado: boolean;
  reportadoEn: string;
}

/** Motivos sugeridos al reasignar un viaje (el panel los ofrece; se guarda string). */
export const MOTIVOS_REASIGNACION = [
  'AVERIA',
  'ACCIDENTE',
  'RELEVO',
  'INCIDENCIA',
  'OTRO',
] as const;
export type MotivoReasignacion = (typeof MOTIVOS_REASIGNACION)[number];

/** Payload del evento WS 'viaje:reasignado' (cambio de unidad y/o conductor). */
export interface ReasignacionViajePayload {
  viajeId: string;
  folio: number | null;
  conductorAnteriorId: string | null;
  conductorNuevoId: string | null;
  unidadCambio: boolean;
  conductorCambio: boolean;
  motivo: string | null;
}

/** Tipo de alerta de geocerca (por ahora solo llegada a una escala). */
export type TipoAlerta = 'llegada_escala';

/**
 * Payload del evento WS 'alerta' de llegada a una escala. Contrato SERIALIZADO
 * (fechas como string ISO) compartido por el gateway (emisión, apps/api) y el
 * panel (recepción, apps/web) para evitar drift entre back y front.
 */
export interface AlertaLlegadaPayload {
  tipo: TipoAlerta;
  viajeId: string;
  /** Folio del viaje; null si no se pudo resolver. */
  folio: number | null;
  escalaOrden: number;
  escalaAccion: string;
  escalaDireccion: string;
  /** true si la escala es el destino final (última del itinerario). */
  esDestino: boolean;
  /** ISO 8601 del momento en que se detectó la llegada. */
  detectadoEn: string;
}

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

// ── Motor de cálculo de viajes (uso adecuado de la unidad) ──
// Contrato compartido por la API (dominio) y el panel web.

export type MotivoInadecuacion =
  | 'SOBREPESO'
  | 'SOBRE_VOLUMEN'
  | 'TIPO_INCOMPATIBLE'
  | 'AUTONOMIA_INSUFICIENTE'
  | 'DATOS_INCOMPLETOS';

/** Método con que se estimó la distancia de la ruta. */
export type MetodoDistancia = 'GEODESICA' | 'RUTA';

export interface MotivoVeredicto {
  codigo: MotivoInadecuacion;
  mensaje: string;
  /** Valor requerido por la carga (kg, m³, km) cuando aplica. */
  requerido?: number;
  /** Valor disponible en la unidad (kg, m³, km) cuando aplica. */
  disponible?: number;
}

export interface VeredictoUnidad {
  unidadId: string;
  placas?: string;
  /** Apta si no hay motivos bloqueantes (DATOS_INCOMPLETOS no bloquea). */
  apta: boolean;
  motivos: MotivoVeredicto[];
  usoPesoPct?: number;
  usoVolumenPct?: number;
  usoAutonomiaPct?: number;
}

export interface ResumenEvaluacion {
  pesoMaxKg: number;
  volumenMaxM3: number;
  distanciaTotalKm: number;
  metodoDistancia: MetodoDistancia;
  /** Avisos no bloqueantes (p. ej. escala sin coordenadas → tramo omitido). */
  advertencias: string[];
  tiposCargaPresentes: string[];
}

export interface ResultadoEvaluacion {
  resumen: ResumenEvaluacion;
  /** Veredictos ordenados: aptas primero, mejor ajuste primero. */
  veredictos: VeredictoUnidad[];
  /** unidadId de la mejor unidad apta, si la hay. */
  recomendada?: string;
}
