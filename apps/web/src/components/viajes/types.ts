import type { EstadoViaje } from '@flotaos/shared-types';

/** Resumen de cliente que viene embebido en el viaje. */
export interface ClienteResumen {
  id: string;
  nombre: string;
  rfc?: string | null;
}

/** Resumen de unidad embebido en el viaje. */
export interface UnidadResumen {
  id: string;
  placas: string;
  marca?: string | null;
  modelo?: string | null;
}

/** Resumen de conductor embebido en el viaje. */
export interface ConductorResumen {
  id: string;
  nombre: string;
  telefono?: string | null;
}

/** Entrada del historial de cambios de estado de un viaje. */
export interface HistorialViaje {
  id: string;
  estadoAnterior: EstadoViaje | null;
  estadoNuevo: EstadoViaje;
  nota?: string | null;
  createdAt: string;
}

/** Viaje tal como lo devuelve la API (listado y detalle). */
export interface Viaje {
  id: string;
  folio: string;
  estado: EstadoViaje;
  cliente: ClienteResumen | null;
  clienteId: string;
  unidad?: UnidadResumen | null;
  unidadId?: string | null;
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
  fechaProgramada?: string | null;
  trackingToken?: string | null;
  historial?: HistorialViaje[];
  createdAt: string;
  updatedAt?: string;
}

/** Payload para crear un viaje. */
export interface CrearViajePayload {
  clienteId: string;
  origenDireccion: string;
  origenLat?: number;
  origenLng?: number;
  destinoDireccion: string;
  destinoLat?: number;
  destinoLng?: number;
  tipoCarga: string;
  descripcionCarga?: string;
  pesoKg?: number;
  dimensiones?: string;
  fechaProgramada?: string;
  unidadId?: string;
  conductorId?: string;
}

/** Tipo genérico para los catálogos (clientes / unidades / conductores). */
export interface OpcionCatalogo {
  id: string;
  label: string;
}
