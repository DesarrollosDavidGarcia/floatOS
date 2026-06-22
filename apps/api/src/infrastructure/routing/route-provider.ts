import { createHash } from 'crypto';
import type { MetodoDistancia } from '@flotaos/shared-types';

/** Un punto geográfico de la ruta. */
export interface PuntoRuta {
  lat: number;
  lng: number;
}

/** Punto de la polilínea trazada: par [lat, lng] (formato Leaflet). */
export type PuntoLatLng = [number, number];

/** Resultado del cálculo de una ruta entre puntos consecutivos. */
export interface RutaCalculada {
  /** Distancia total en kilómetros. */
  km: number;
  /** Tiempo estimado de conducción en minutos (null si el proveedor no lo da). */
  tiempoMin: number | null;
  /** Método con que se obtuvo la distancia. */
  metodo: MetodoDistancia;
  /**
   * Polilínea de la ruta siguiendo las carreteras ([lat, lng] en orden). null
   * cuando el proveedor no la da (p. ej. geodésica → el mapa traza líneas rectas).
   */
  geometria: PuntoLatLng[] | null;
  /** Avisos no bloqueantes para el usuario. */
  advertencias: string[];
}

/** Opciones del cálculo a nivel de proveedor. */
export interface CalcularOpts {
  /**
   * Hora de salida (ISO 8601) para tráfico histórico/predicho. Solo TomTom la usa;
   * si está presente activa `traffic=true` con `departAt`. null = flujo libre.
   */
  departAt?: string | null;
}

/** Proveedor de cálculo de distancia/tiempo entre puntos consecutivos. */
export interface RouteProvider {
  calcular(puntos: PuntoRuta[], opts?: CalcularOpts): Promise<RutaCalculada>;
}

/**
 * Proveedor de ruteo por CARRETERA (TomTom, Google…). Sobre `RouteProvider`
 * añade lo que el orquestador necesita para tratarlos de forma intercambiable:
 * si está disponible (hay key) y una etiqueta de proveedor para segmentar la
 * caché. El proveedor concreto se elige por env `ROUTING_PROVIDER`.
 */
export interface CarreteraProvider extends RouteProvider {
  /** Etiqueta del proveedor (p. ej. 'TOMTOM' | 'GOOGLE') — segmenta `ruta_cache`. */
  readonly proveedor: string;
  /** true si hay key configurada y el ruteo por carretera está disponible. */
  disponible(): boolean;
}

/** Token DI del proveedor de carretera activo (resuelto por `ROUTING_PROVIDER`). */
export const CARRETERA_PROVIDER = Symbol('CARRETERA_PROVIDER');

/**
 * Error de tope diario superado; el orquestador lo distingue por `instanceof`
 * para degradar a geodésica con un mensaje específico. Compartido por los
 * proveedores de carretera que imponen un tope defensivo de llamadas/día.
 */
export class LimiteDiarioError extends Error {
  constructor(proveedor = 'ruteo') {
    super(`Tope diario de ${proveedor} superado`);
    this.name = 'LimiteDiarioError';
  }
}

/** Decimales con que se redondean las coords en la clave de caché (~11 m). */
export const DECIMALES_CLAVE_RUTA = 4;

/**
 * Clave de caché determinista de una ruta: hash de las coordenadas en orden
 * (redondeadas a ~11 m) más el perfil del proveedor. El redondeo evita que un pin
 * movido unos metros invalide la caché. Versionada (`v1`) por si cambia el
 * formato o el perfil de ruteo.
 */
export function claveRuta(puntos: PuntoRuta[], perfil: string): string {
  const norm = puntos
    .map(
      (p) =>
        `${p.lat.toFixed(DECIMALES_CLAVE_RUTA)},${p.lng.toFixed(DECIMALES_CLAVE_RUTA)}`,
    )
    .join(';');
  return createHash('sha1').update(`${perfil}|v1|${norm}`).digest('hex');
}

/**
 * Type guard para una polilínea leída de JSONB (caché/snapshot): valida la forma
 * antes de servirla al cliente. Si no valida, el llamador degrada a null (el mapa
 * cae a líneas rectas). Comprueba la forma sin recorrer miles de puntos.
 */
export function esGeometria(x: unknown): x is PuntoLatLng[] {
  if (!Array.isArray(x) || x.length < 2) return false;
  const ok = (p: unknown): boolean =>
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number';
  // Muestra: primero, último y uno intermedio (evita O(n) en cada hit).
  return ok(x[0]) && ok(x[x.length - 1]) && ok(x[x.length >> 1]);
}
