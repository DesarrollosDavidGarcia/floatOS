'use client';

import { useQuery } from '@tanstack/react-query';
import type { EstadoViaje } from '@flotaos/shared-types';
import { api } from '@/lib/api';
import type { OpcionCatalogo } from './types';

interface ClienteApi {
  id: string;
  razonSocial: string;
}
interface UnidadApi {
  id: string;
  placas: string;
  marca?: string | null;
  modelo?: string | null;
}
interface ConductorApi {
  id: string;
  nombre: string;
  apellidos: string | null;
  viajeActivo: { id: string; folio: number; estado: EstadoViaje } | null;
}

/** Opción del selector de conductor: nombre completo + viaje que lo ocupa. */
export interface OpcionConductor extends OpcionCatalogo {
  viajeActivo: { id: string; folio: number; estado: EstadoViaje } | null;
}

interface PaginadoApi<T> {
  data: T[];
}

/** Catálogo de clientes para selects (carga hasta 100). */
export function useClientesCatalogo() {
  return useQuery<OpcionCatalogo[]>({
    queryKey: ['catalogo', 'clientes'],
    queryFn: async () => {
      const { data } = await api.get<PaginadoApi<ClienteApi>>('/clientes', {
        params: { pageSize: 100 },
      });
      return data.data.map((c) => ({ id: c.id, label: c.razonSocial }));
    },
  });
}

/** Catálogo de unidades para selects. */
export function useUnidadesCatalogo() {
  return useQuery<OpcionCatalogo[]>({
    queryKey: ['catalogo', 'unidades'],
    queryFn: async () => {
      const { data } = await api.get<PaginadoApi<UnidadApi>>('/unidades', {
        params: { pageSize: 100 },
      });
      return data.data.map((u) => ({
        id: u.id,
        label: [u.placas, [u.marca, u.modelo].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(' · '),
      }));
    },
  });
}

interface CajaApi {
  id: string;
  placas: string;
  tipo?: string | null;
}

/** Catálogo de cajas / remolques para selects. */
export function useCajasCatalogo() {
  return useQuery<OpcionCatalogo[]>({
    queryKey: ['catalogo', 'cajas'],
    queryFn: async () => {
      const { data } = await api.get<PaginadoApi<CajaApi>>('/cajas', {
        params: { pageSize: 100 },
      });
      return data.data.map((c) => ({ id: c.id, label: c.placas }));
    },
  });
}

/** Catálogo de conductores para selects, con su disponibilidad. */
export function useConductoresCatalogo() {
  return useQuery<OpcionConductor[]>({
    queryKey: ['catalogo', 'conductores'],
    queryFn: async () => {
      const { data } = await api.get<PaginadoApi<ConductorApi>>('/conductores', {
        params: { pageSize: 100 },
      });
      return data.data.map((c) => ({
        id: c.id,
        label: [c.nombre, c.apellidos].filter(Boolean).join(' '),
        viajeActivo: c.viajeActivo ?? null,
      }));
    },
  });
}
