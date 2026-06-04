import type { EstadoViaje } from '@flotaos/shared-types';

/** Relaciones resumidas que devuelve el listado de viajes. */
export interface ViajeResumen {
  id: string;
  folio: number;
  estado: EstadoViaje;
  fechaProgramada: string | null;
  fechaEntrega: string | null;
  cliente: { id: string; razonSocial: string } | null;
  conductor: { id: string; nombre: string; apellidos: string } | null;
  unidad: { id: string; placas: string } | null;
}

/** Una fila del centro de alertas: documento por vencer. */
export interface AlertaVencimiento {
  tipo: 'unidad' | 'conductor';
  entidad: string;
  tipoDocumento: string;
  fechaVencimiento: string;
  diasRestantes: number;
}
