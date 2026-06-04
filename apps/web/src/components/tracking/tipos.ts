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
