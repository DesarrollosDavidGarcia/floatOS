import { z } from 'zod';
import type {
  CrearViajePayload,
  EscalaViajePayload,
  Viaje,
} from '../types';

export const NINGUNO = '__ninguno__';

const cargaSchema = z.object({
  sentido: z.string().min(1),
  tipoCarga: z.string().min(1, 'Tipo requerido'),
  descripcion: z.string().optional(),
  pesoKg: z
    .string()
    .min(1, 'Peso requerido')
    .refine((v) => Number(v) > 0, 'Peso > 0'),
  volumenM3: z.string().optional(),
  cantidad: z.string().optional(),
});

const escalaSchema = z.object({
  accion: z.string().min(1, 'Acción requerida'),
  direccion: z.string().min(1, 'Dirección requerida'),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  notas: z.string().optional(),
  cargas: z.array(cargaSchema),
});

export const viajeFormSchema = z.object({
  clienteId: z.string().min(1, 'Selecciona un cliente'),
  fechaProgramada: z.string().optional(),
  unidadId: z.string(),
  conductorId: z.string(),
  escalas: z
    .array(escalaSchema)
    .min(2, 'Se requieren al menos origen y destino'),
});

export type CargaFormValues = z.infer<typeof cargaSchema>;
export type EscalaFormValues = z.infer<typeof escalaSchema>;
export type ViajeFormValues = z.infer<typeof viajeFormSchema>;

/** Escala vacía con una carga del sentido indicado. */
export function escalaVacia(
  accion: string,
  sentido: 'CARGA' | 'DESCARGA',
): EscalaFormValues {
  return {
    accion,
    direccion: '',
    lat: null,
    lng: null,
    notas: '',
    cargas: sentido
      ? [{ sentido, tipoCarga: 'GENERAL', descripcion: '', pesoKg: '', volumenM3: '', cantidad: '' }]
      : [],
  };
}

/** Valores por defecto al crear (origen + destino). */
export function defaultsCrear(): ViajeFormValues {
  return {
    clienteId: '',
    fechaProgramada: '',
    unidadId: NINGUNO,
    conductorId: NINGUNO,
    escalas: [escalaVacia('RECOGER', 'CARGA'), escalaVacia('ENTREGAR', 'DESCARGA')],
  };
}

/** Mapea un Viaje existente al formulario (modo edición). */
export function defaultsDeViaje(v: Viaje): ViajeFormValues {
  const escalas = (v.escalas ?? []).map((e) => ({
    accion: e.accion,
    direccion: e.direccion,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    notas: e.notas ?? '',
    cargas: (e.cargas ?? []).map((c) => ({
      sentido: c.sentido,
      tipoCarga: c.tipoCarga,
      descripcion: c.descripcion ?? '',
      pesoKg: String(c.pesoKg ?? ''),
      volumenM3: c.volumenM3 != null ? String(c.volumenM3) : '',
      cantidad: c.cantidad != null ? String(c.cantidad) : '',
    })),
  }));
  return {
    clienteId: v.clienteId,
    fechaProgramada: v.fechaProgramada
      ? new Date(v.fechaProgramada).toISOString().slice(0, 16)
      : '',
    unidadId: v.unidadId ?? NINGUNO,
    conductorId: v.conductorId ?? NINGUNO,
    escalas: escalas.length >= 2 ? escalas : defaultsCrear().escalas,
  };
}

/** Convierte las escalas del formulario al shape del payload (números reales). */
export function escalasPayload(
  escalas: EscalaFormValues[],
): EscalaViajePayload[] {
  return escalas.map((e) => ({
    accion: e.accion,
    direccion: e.direccion.trim(),
    lat: e.lat ?? undefined,
    lng: e.lng ?? undefined,
    notas: e.notas?.trim() || undefined,
    cargas: e.cargas.map((c) => ({
      sentido: c.sentido,
      tipoCarga: c.tipoCarga,
      descripcion: c.descripcion?.trim() || undefined,
      pesoKg: Number(c.pesoKg),
      volumenM3: c.volumenM3 ? Number(c.volumenM3) : undefined,
      cantidad: c.cantidad ? Number(c.cantidad) : undefined,
    })),
  }));
}

/**
 * Payload tolerante para la evaluación en vivo (el itinerario puede estar a medio
 * llenar): rellena acción/dirección vacías con placeholders (no afectan al motor)
 * y descarta cargas sin peso válido.
 */
export function evalEscalasPayload(
  escalas: EscalaFormValues[],
): EscalaViajePayload[] {
  return escalas.map((e) => ({
    accion: e.accion || 'PASO',
    direccion: e.direccion.trim() || '—',
    lat: e.lat ?? undefined,
    lng: e.lng ?? undefined,
    cargas: e.cargas
      .filter((c) => Number(c.pesoKg) > 0)
      .map((c) => ({
        sentido: c.sentido,
        tipoCarga: c.tipoCarga,
        pesoKg: Number(c.pesoKg),
        volumenM3: c.volumenM3 ? Number(c.volumenM3) : undefined,
      })),
  }));
}

/** Payload completo de creación. */
export function toCrearPayload(v: ViajeFormValues): CrearViajePayload {
  return {
    clienteId: v.clienteId,
    fechaProgramada: v.fechaProgramada
      ? new Date(v.fechaProgramada).toISOString()
      : undefined,
    unidadId: v.unidadId !== NINGUNO ? v.unidadId : undefined,
    conductorId: v.conductorId !== NINGUNO ? v.conductorId : undefined,
    escalas: escalasPayload(v.escalas),
  };
}
