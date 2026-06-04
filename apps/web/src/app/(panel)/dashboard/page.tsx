'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ClipboardList, PackageCheck } from 'lucide-react';
import { EstadoViaje, type Paginado } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { ESTADOS_ACTIVOS } from '@/lib/estado-viaje';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ViajesActivosCard } from '@/components/dashboard/viajes-activos-card';
import { VencimientosCard } from '@/components/dashboard/vencimientos-card';
import type { AlertaVencimiento, ViajeResumen } from '@/components/dashboard/tipos';

const REFETCH_MS = 20_000;
const ESTADOS_ACTIVOS_SET = new Set<EstadoViaje>(ESTADOS_ACTIVOS);

/** ¿La fecha (ISO) cae en el día de hoy (zona horaria local)? */
function esHoy(iso: string | null): boolean {
  if (!iso) return false;
  const fecha = new Date(iso);
  const hoy = new Date();
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  );
}

export default function DashboardPage() {
  const viajesQuery = useQuery({
    queryKey: ['dashboard', 'viajes'],
    queryFn: async () => {
      const { data } = await api.get<Paginado<ViajeResumen>>('/viajes', {
        params: { pageSize: 100 },
      });
      return data;
    },
    refetchInterval: REFETCH_MS,
  });

  const alertasQuery = useQuery({
    queryKey: ['dashboard', 'vencimientos'],
    queryFn: async () => {
      const { data } = await api.get<AlertaVencimiento[]>('/alertas/vencimientos', {
        params: { dias: 30 },
      });
      return data;
    },
    refetchInterval: REFETCH_MS,
  });

  useEffect(() => {
    if (viajesQuery.error) toast.error(apiError(viajesQuery.error));
  }, [viajesQuery.error]);

  useEffect(() => {
    if (alertasQuery.error) toast.error(apiError(alertasQuery.error));
  }, [alertasQuery.error]);

  const viajes = viajesQuery.data?.data ?? [];
  const vencimientos = alertasQuery.data ?? [];

  const viajesActivos = viajes.filter((v) => ESTADOS_ACTIVOS_SET.has(v.estado));
  const entregasHoy = viajes.filter(
    (v) => v.estado === EstadoViaje.ENTREGADO && esHoy(v.fechaEntrega),
  ).length;
  const asignadosPendientes = viajes.filter(
    (v) => v.estado === EstadoViaje.ASIGNADO,
  ).length;
  const alertasProximas = vencimientos.filter((v) => v.diasRestantes <= 7).length;

  const cargandoViajes = viajesQuery.isLoading;
  const cargandoAlertas = alertasQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen operativo de la flotilla en tiempo casi real."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Viajes activos"
          value={viajesActivos.length}
          description="En curso ahora mismo"
          icon={Activity}
          accentClassName="text-amber-500"
          loading={cargandoViajes}
        />
        <MetricCard
          title="Entregas de hoy"
          value={entregasHoy}
          description="Entregados en el día"
          icon={PackageCheck}
          accentClassName="text-green-600"
          loading={cargandoViajes}
        />
        <MetricCard
          title="Asignados pendientes"
          value={asignadosPendientes}
          description="A la espera de ser aceptados"
          icon={ClipboardList}
          accentClassName="text-blue-600"
          loading={cargandoViajes}
        />
        <MetricCard
          title="Alertas próximas"
          value={alertasProximas}
          description="Documentos que vencen en 7 días"
          icon={AlertTriangle}
          accentClassName="text-destructive"
          loading={cargandoAlertas}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ViajesActivosCard viajes={viajesActivos} loading={cargandoViajes} />
        </div>
        <div>
          <VencimientosCard
            vencimientos={vencimientos.slice(0, 5)}
            loading={cargandoAlertas}
          />
        </div>
      </div>
    </div>
  );
}
