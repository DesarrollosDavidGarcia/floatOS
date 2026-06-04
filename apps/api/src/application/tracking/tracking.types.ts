/** Datos de entrada de un punto de ubicación (ya normalizados desde el DTO). */
export interface PuntoUbicacion {
  lat: number;
  lng: number;
  velocidad?: number;
  rumbo?: number;
  precision?: number;
  capturadoEn: string; // ISO 8601
}

/** Ubicación pública que se reemite por el gateway / link público. */
export interface UbicacionPublica {
  id: string;
  viajeId: string;
  lat: number;
  lng: number;
  velocidad: number | null;
  rumbo: number | null;
  precision: number | null;
  capturadoEn: Date;
  createdAt: Date;
}

/** Tipos de alerta de geocerca emitidos al monitorista. */
export type TipoAlertaGeocerca = 'llegada_origen' | 'llegada_destino';

/** Vista pública del viaje para el link de seguimiento del cliente final. */
export interface SeguimientoPublico {
  folio: number;
  estado: string;
  origenDireccion: string;
  destinoDireccion: string;
  cliente: { razonSocial: string };
  conductor: { nombre: string } | null;
  ultimaUbicacion: {
    lat: number;
    lng: number;
    velocidad: number | null;
    rumbo: number | null;
    capturadoEn: Date;
  } | null;
}
