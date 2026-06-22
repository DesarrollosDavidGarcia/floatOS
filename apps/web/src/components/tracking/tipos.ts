import type { EstadoViaje } from '@flotaos/shared-types';

/** Viaje resumido tal como lo devuelve GET /viajes (SELECCION_LISTADO). */
export interface ViajeActivo {
  id: string;
  folio: number;
  estado: EstadoViaje;
  origenDireccion: string;
  origenLat: number | null;
  origenLng: number | null;
  destinoDireccion: string;
  destinoLat: number | null;
  destinoLng: number | null;
  cliente: { id: string; razonSocial: string } | null;
  conductor: { id: string; nombre: string; apellidos: string } | null;
}

/**
 * Payload del evento WS 'ubicacion:actualizada'. La API reemite la
 * UbicacionPublica (ver tracking.types.ts del backend). Se hacen opcionales los
 * campos no críticos para tolerar variaciones del payload.
 */
export interface UbicacionEvento {
  viajeId: string;
  lat: number;
  lng: number;
  velocidad?: number | null;
  rumbo?: number | null;
  capturadoEn?: string;
}

/** Posición conocida de un viaje (última ubicación recibida). */
export interface PosicionViaje {
  viajeId: string;
  lat: number;
  lng: number;
  velocidad?: number | null;
  capturadoEn?: string;
}

/** Notificación del panel (campana + badge de no leídas): llegada o incidencia. */
export interface NotificacionLlegada {
  id: string;
  /** Tipo de notificación; ausente en datos viejos = 'llegada'. */
  kind?: 'llegada' | 'incidencia';
  viajeId: string;
  folio: number | null;
  escalaOrden: number | null;
  escalaDireccion: string | null;
  esDestino: boolean;
  /** Título propio (incidencias); las llegadas lo derivan con tituloLlegada(). */
  titulo?: string | null;
  /** Gravedad de la incidencia (ALTA/CRITICA…); solo para kind 'incidencia'. */
  gravedad?: string | null;
  /** true si la incidencia es una emergencia (pánico/SOS) — resalta en rojo. */
  critica?: boolean;
  recibidaEn: string; // ISO de recepción en el cliente
  leida: boolean;
}
