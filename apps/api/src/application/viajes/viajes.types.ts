import { Prisma } from '@prisma/client';
import { EstadoViaje } from '@flotaos/shared-types';

/** Selección resumida de relaciones para listados y detalle. */
export const RELACIONES_RESUMEN = {
  cliente: {
    select: { id: true, razonSocial: true, rfc: true },
  },
  unidad: {
    select: { id: true, placas: true, tipo: true, marca: true, modelo: true },
  },
  conductor: {
    select: { id: true, nombre: true, apellidos: true, telefono: true },
  },
} satisfies Prisma.ViajeInclude;

/**
 * Selección para el LISTADO de viajes: incluye todos los campos escalares
 * EXCEPTO `trackingToken` (link público que no debe exponerse en listados),
 * más las relaciones resumidas.
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

/** Datos para crear un viaje. */
export interface CrearViajeInput {
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

/** Datos para editar campos generales de un viaje. */
export interface EditarViajeInput {
  origenDireccion?: string;
  origenLat?: number;
  origenLng?: number;
  destinoDireccion?: string;
  destinoLat?: number;
  destinoLng?: number;
  tipoCarga?: string;
  descripcionCarga?: string;
  pesoKg?: number;
  dimensiones?: string;
  fechaProgramada?: string;
}

/** Datos para asignar/reasignar unidad y/o conductor. */
export interface AsignarViajeInput {
  unidadId?: string;
  conductorId?: string;
}

/** Datos para cambiar el estado de un viaje. */
export interface CambiarEstadoInput {
  estado: EstadoViaje;
  nota?: string;
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
}
