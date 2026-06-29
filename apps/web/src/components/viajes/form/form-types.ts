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
  // El peso se valida condicionalmente en el superRefine (solo para CARGA): en
  // PERSONAL las paradas no llevan carga y sus campos están ocultos.
  pesoKg: z.string().optional(),
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

export const viajeFormSchema = z
  .object({
    tipoServicio: z.enum(['CARGA', 'PERSONAL']),
    clienteId: z.string().min(1, 'Selecciona un cliente'),
    fechaProgramada: z.string().optional(),
    unidadId: z.string(),
    conductorId: z.string(),
    // Solo personal; se valida en superRefine según el tipo.
    numPasajeros: z.string().optional(),
    escalas: z
      .array(escalaSchema)
      .min(2, 'Se requieren al menos origen y destino'),
  })
  .superRefine((v, ctx) => {
    if (v.tipoServicio === 'PERSONAL') {
      const n = Number(v.numPasajeros);
      if (!v.numPasajeros || Number.isNaN(n) || n < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['numPasajeros'],
          message: 'Indica el número de pasajeros (mínimo 1)',
        });
      }
      return; // En personal no se validan cargas (no aplican).
    }
    // CARGA: cada carga capturada exige un peso > 0.
    v.escalas.forEach((e, i) => {
      e.cargas.forEach((c, j) => {
        if (!c.pesoKg || Number(c.pesoKg) <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['escalas', i, 'cargas', j, 'pesoKg'],
            message: 'Peso requerido (> 0)',
          });
        }
      });
    });
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
    tipoServicio: 'CARGA',
    clienteId: '',
    fechaProgramada: '',
    unidadId: NINGUNO,
    conductorId: NINGUNO,
    numPasajeros: '',
    escalas: [escalaVacia('RECOGER', 'CARGA'), escalaVacia('ENTREGAR', 'DESCARGA')],
  };
}

/** ISO → valor para <input type="datetime-local"> en hora LOCAL (sin corrimiento). */
function aInputLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
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
    tipoServicio: v.tipoServicio ?? 'CARGA',
    clienteId: v.clienteId,
    fechaProgramada: v.fechaProgramada ? aInputLocal(v.fechaProgramada) : '',
    unidadId: v.unidadId ?? NINGUNO,
    conductorId: v.conductorId ?? NINGUNO,
    numPasajeros: v.numPasajeros != null ? String(v.numPasajeros) : '',
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

/**
 * Escalas para enviar al API. En servicio de PERSONAL se omiten las cargas (las
 * paradas son de subida/bajada de pasajeros, no llevan mercancía).
 */
export function escalasParaEnviar(v: ViajeFormValues): EscalaViajePayload[] {
  const escalas =
    v.tipoServicio === 'PERSONAL'
      ? v.escalas.map((e) => ({ ...e, cargas: [] }))
      : v.escalas;
  return escalasPayload(escalas);
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
    tipoServicio: v.tipoServicio,
    numPasajeros:
      v.tipoServicio === 'PERSONAL' ? Number(v.numPasajeros) : undefined,
    escalas: escalasParaEnviar(v),
  };
}
