import { Prisma } from '@prisma/client';
import { EstadoViaje } from '@flotaos/shared-types';

/** Selección resumida de relaciones para listados y detalle. */
export const RELACIONES_RESUMEN = {
  cliente: {
    select: {
      id: true,
      razonSocial: true,
      rfc: true,
      // Contacto principal (o el primero): destinatario por defecto al cotizar.
      contactos: {
        orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }],
        take: 1,
        select: { nombre: true, email: true, telefono: true },
      },
    },
  },
  unidad: {
    select: { id: true, placas: true, tipo: true, marca: true, modelo: true },
  },
  caja: {
    select: { id: true, placas: true, tipo: true },
  },
  conductor: {
    select: { id: true, nombre: true, apellidos: true, telefono: true },
  },
} satisfies Prisma.ViajeInclude;

/** Include para el DETALLE: relaciones resumidas + itinerario (escalas + cargas). */
export const RELACIONES_DETALLE = {
  ...RELACIONES_RESUMEN,
  escalas: {
    orderBy: { orden: 'asc' },
    include: { cargas: true, contactos: { orderBy: { createdAt: 'asc' } } },
  },
  historialAsignaciones: { orderBy: { createdAt: 'desc' } },
  incidencias: {
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      tipo: true,
      gravedad: true,
      titulo: true,
      descripcion: true,
      lugar: true,
      resuelta: true,
      fecha: true,
    },
  },
} satisfies Prisma.ViajeInclude;

/**
 * Selección para el LISTADO de viajes: incluye todos los campos escalares
 * EXCEPTO `trackingToken` (link público que no debe exponerse en listados),
 * más las relaciones resumidas. No incluye escalas (el listado usa el resumen).
 */
export const SELECCION_LISTADO = {
  id: true,
  folio: true,
  clienteId: true,
  unidadId: true,
  conductorId: true,
  origenDireccion: true,
  origenLat: true,
  origenLng: true,
  destinoDireccion: true,
  destinoLat: true,
  destinoLng: true,
  tipoCarga: true,
  descripcionCarga: true,
  pesoKg: true,
  dimensiones: true,
  distanciaEstimadaKm: true,
  pesoMaxKg: true,
  volumenMaxM3: true,
  estado: true,
  fechaProgramada: true,
  fechaInicio: true,
  fechaEntrega: true,
  odometroInicial: true,
  odometroFinal: true,
  createdAt: true,
  updatedAt: true,
  ...RELACIONES_RESUMEN,
} satisfies Prisma.ViajeSelect;

// ── Contratos de entrada de la capa de aplicación ──
// Los DTOs de presentation satisfacen estructuralmente estas interfaces; la
// capa application NO depende de presentation.

/** Un movimiento de carga (recoger/entregar) dentro de una escala. */
export interface CargaInput {
  sentido: string; // CARGA | DESCARGA
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

/** Una escala del itinerario. */
export interface EscalaInput {
  accion: string;
  direccion: string;
  lat?: number;
  lng?: number;
  notas?: string;
  ventanaDesde?: string;
  ventanaHasta?: string;
  cargas?: CargaInput[];
}

/** Datos para crear un viaje. */
export interface CrearViajeInput {
  clienteId: string;
  escalas: EscalaInput[];
  fechaProgramada?: string;
  unidadId?: string;
  conductorId?: string;
}

/** Datos para editar un viaje. Si `escalas` viene, reemplaza el itinerario. */
export interface EditarViajeInput {
  escalas?: EscalaInput[];
  fechaProgramada?: string;
}

/** Datos para evaluar un itinerario contra la flota (motor de cálculo). */
export interface EvaluarViajeInput {
  escalas: EscalaInput[];
  unidadIds?: string[];
}

/** Datos para asignar/reasignar unidad, caja y/o conductor. `null` = desasignar. */
export interface AsignarViajeInput {
  unidadId?: string | null;
  cajaId?: string | null;
  conductorId?: string | null;
  /** Motivo de la reasignación (avería/accidente/relevo/…); se guarda en auditoría. */
  motivo?: string;
  nota?: string;
}

/** Datos para cambiar el estado de un viaje. */
export interface CambiarEstadoInput {
  estado: EstadoViaje;
  nota?: string;
}

/** Plan multi-día que el monitorista asigna al viaje (alimenta la llegada estimada). */
export interface PlanRutaInput {
  horasConduccionDia: number;
  horasDescanso: number;
  minutosPorEscala: number;
  horaInicio: number;
}

/** Filtros y paginación para el listado de viajes. */
export interface ListarViajesInput {
  estado?: EstadoViaje;
  clienteId?: string;
  conductorId?: string;
  unidadId?: string;
  desde?: string;
  hasta?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  /**
   * True cuando quien lista es un conductor (no un admin filtrando por
   * conductor): aplica la regla de visibilidad de cotizaciones
   * (ver visibilidad-conductor.helper).
   */
  paraConductor?: boolean;
}
