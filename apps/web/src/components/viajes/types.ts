import type { EstadoViaje } from '@flotaos/shared-types';
import type { PlanRutaParams } from './plan-ruta';

/** Resumen de cliente que viene embebido en el viaje. */
export interface ClienteResumen {
  id: string;
  razonSocial: string;
  rfc?: string | null;
  /** Contacto principal (o el primero); destinatario por defecto al cotizar. */
  contactos?: { nombre: string; email?: string | null; telefono?: string | null }[];
}

/** Resumen de unidad embebido en el viaje. */
export interface UnidadResumen {
  id: string;
  placas: string;
  marca?: string | null;
  modelo?: string | null;
}

/** Resumen de caja / remolque embebido en el viaje. */
export interface CajaResumen {
  id: string;
  placas: string;
  tipo?: string | null;
}

/** Resumen de conductor embebido en el viaje. */
export interface ConductorResumen {
  id: string;
  nombre: string;
  telefono?: string | null;
}

/** Movimiento de carga (recoger/entregar) dentro de una escala. */
export interface CargaEscala {
  id: string;
  sentido: string; // CARGA | DESCARGA
  tipoCarga: string;
  descripcion?: string | null;
  pesoKg: number | string;
  volumenM3?: number | string | null;
  largoM?: number | string | null;
  anchoM?: number | string | null;
  altoM?: number | string | null;
  cantidad: number;
  loteRef?: string | null;
}

/** Persona a cargo en una escala: recibe el aviso de llegada del transportista. */
export interface ContactoEscala {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  /** Sello del email de llegada enviado; null si aún no se ha avisado. */
  notificadoEn?: string | null;
}

/** Escala (parada) del itinerario de un viaje. */
export interface EscalaViaje {
  id: string;
  orden: number;
  accion: string; // catálogo ACCION_ESCALA
  direccion: string;
  lat?: number | null;
  lng?: number | null;
  notas?: string | null;
  cargas: CargaEscala[];
  contactos?: ContactoEscala[];
}

/** Entrada del historial de cambios de estado de un viaje. */
export interface HistorialViaje {
  id: string;
  estadoAnterior: EstadoViaje | null;
  estadoNuevo: EstadoViaje;
  nota?: string | null;
  createdAt: string;
}

/** Incidencia operativa reportada en un viaje (avería, choque, etc.). */
export interface Incidencia {
  id: string;
  tipo: string;
  gravedad: string;
  titulo: string;
  descripcion?: string | null;
  lugar?: string | null;
  resuelta: boolean;
  fecha: string;
}

/** Entrada del historial de reasignaciones (cambio de unidad y/o conductor). */
export interface HistorialAsignacion {
  id: string;
  unidadAnterior?: string | null;
  unidadNueva?: string | null;
  cajaAnterior?: string | null;
  cajaNueva?: string | null;
  conductorAnterior?: string | null;
  conductorNuevo?: string | null;
  motivo?: string | null;
  nota?: string | null;
  createdAt: string;
}

/** Viaje tal como lo devuelve la API (listado y detalle). */
export interface Viaje {
  id: string;
  folio: number;
  estado: EstadoViaje;
  cliente: ClienteResumen | null;
  clienteId: string;
  unidad?: UnidadResumen | null;
  unidadId?: string | null;
  caja?: CajaResumen | null;
  cajaId?: string | null;
  conductor?: ConductorResumen | null;
  conductorId?: string | null;
  origenDireccion: string;
  origenLat?: number | null;
  origenLng?: number | null;
  destinoDireccion: string;
  destinoLat?: number | null;
  destinoLng?: number | null;
  tipoCarga: string;
  descripcionCarga?: string | null;
  pesoKg?: number | null;
  dimensiones?: string | null;
  distanciaEstimadaKm?: number | string | null;
  /** ETA estimada por carretera en minutos (free-flow); null si geodésica. */
  tiempoEstimadoMin?: number | null;
  pesoMaxKg?: number | string | null;
  volumenMaxM3?: number | string | null;
  /** Polilínea de la ruta por carretera ([[lat, lng], ...]); null si geodésica. */
  rutaGeometria?: [number, number][] | null;
  /** Plan multi-día asignado por el monitorista (horas/día, descanso, escala, inicio). */
  planRuta?: PlanRutaParams | null;
  escalas?: EscalaViaje[];
  fechaProgramada?: string | null;
  trackingToken?: string | null;
  historial?: HistorialViaje[];
  historialAsignaciones?: HistorialAsignacion[];
  incidencias?: Incidencia[];
  createdAt: string;
  updatedAt?: string;
}

/** Una carga dentro de una escala en el payload de creación/edición. */
export interface CargaEscalaPayload {
  sentido: string;
  tipoCarga: string;
  descripcion?: string;
  pesoKg: number;
  volumenM3?: number;
  largoM?: number;
  anchoM?: number;
  altoM?: number;
  cantidad?: number;
  loteRef?: string;
}

/** Una escala en el payload de creación/edición. */
export interface EscalaViajePayload {
  accion: string;
  direccion: string;
  lat?: number;
  lng?: number;
  notas?: string;
  cargas?: CargaEscalaPayload[];
}

/** Payload para crear un viaje (itinerario de escalas). */
export interface CrearViajePayload {
  clienteId: string;
  escalas: EscalaViajePayload[];
  fechaProgramada?: string;
  unidadId?: string;
  conductorId?: string;
}

/** Tipo genérico para los catálogos (clientes / unidades / conductores). */
export interface OpcionCatalogo {
  id: string;
  label: string;
}
