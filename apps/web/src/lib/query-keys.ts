import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida todas las queries que dependen del estado de los viajes. Tras crear,
 * editar, asignar o cambiar el estado de un viaje hay que refrescar no solo el
 * listado (`['viajes']`) sino también el dashboard y el tracking, que muestran
 * conteos/posiciones derivados y antes quedaban desfasados hasta su refetch.
 */
export function invalidarViajes(qc: QueryClient, viajeId?: string): void {
  qc.invalidateQueries({ queryKey: ['viajes'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['tracking'] });
  if (viajeId) qc.invalidateQueries({ queryKey: ['viaje', viajeId] });
}
