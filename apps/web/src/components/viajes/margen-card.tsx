'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatearMoneda } from '@/lib/estado-cotizacion';
import { fechaHora } from '@/lib/fecha';

interface LineaMargen {
  concepto: string;
  monto: number;
  detalle?: string;
  /** false = el monto es una estimación, no un dato capturado del viaje. */
  real: boolean;
}

interface EstanciaEscala {
  orden: number;
  accion: string;
  direccion: string;
  llegadaEn: string | null;
  salidaEn: string | null;
  estanciaMin: number | null;
}

interface Margen {
  ingreso: number;
  costos: LineaMargen[];
  costoTotal: number;
  margen: number;
  margenPct: number | null;
  km: number;
  origenKm: 'ODOMETRO' | 'ESTIMADO' | 'SIN_DATO';
  origenDiesel: 'TICKET' | 'ESTIMADO' | 'SIN_DATO';
  faltantes: string[];
  escalas: EstanciaEscala[];
  estanciaTotalMin: number;
}

const ORIGEN_KM_LABEL: Record<Margen['origenKm'], string> = {
  ODOMETRO: 'odómetro',
  ESTIMADO: 'ruta planeada',
  SIN_DATO: 'sin dato',
};

/** Minutos a "2 h 15 min", que es como se lee una demora. */
function duracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function Kpi({
  label,
  valor,
  className,
}: {
  label: string;
  valor: string;
  className?: string;
}) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums', className)}>{valor}</p>
    </div>
  );
}

/**
 * Margen del viaje: ingreso contra costos, con el detalle de cada línea y las
 * estancias en escala. Solo la ve el ADMIN; el endpoint también lo restringe.
 *
 * Las líneas estimadas van marcadas y los datos que faltan se listan aparte a
 * propósito: un margen calculado con la mitad de los costos se ve mejor de lo
 * que es, y quien lo lea tiene que saberlo.
 */
export function MargenCard({ viajeId }: { viajeId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['viaje', viajeId, 'margen'],
    queryFn: async () => {
      const { data } = await api.get<Margen>(`/viajes/${viajeId}/margen`);
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudo calcular el margen de este viaje.
      </p>
    );
  }

  const positivo = data.margen >= 0;
  const escalasConEstancia = data.escalas.filter((e) => e.llegadaEn);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Kpi label="Ingreso" valor={formatearMoneda(data.ingreso)} />
        <Kpi label="Costos" valor={formatearMoneda(data.costoTotal)} />
        <Kpi
          label={data.margenPct != null ? `Margen (${data.margenPct}%)` : 'Margen'}
          valor={formatearMoneda(data.margen)}
          className={positivo ? 'text-emerald-600' : 'text-destructive'}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {data.km} km según {ORIGEN_KM_LABEL[data.origenKm]}
        {data.origenDiesel === 'TICKET' && ' · combustible de tickets capturados'}
        {data.origenDiesel === 'ESTIMADO' && ' · combustible estimado por rendimiento'}
      </p>

      {data.costos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay ningún costo que calcular para este viaje.
        </p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {data.costos.map((l) => (
            <li key={l.concepto} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{l.concepto}</span>
                  {!l.real && (
                    <Badge variant="outline" className="text-[10px]">
                      estimado
                    </Badge>
                  )}
                </div>
                {l.detalle && (
                  <p className="text-xs text-muted-foreground">{l.detalle}</p>
                )}
              </div>
              <span className="shrink-0 tabular-nums">{formatearMoneda(l.monto)}</span>
            </li>
          ))}
        </ul>
      )}

      {escalasConEstancia.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Estancia en escalas
            {data.estanciaTotalMin > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                total {duracion(data.estanciaTotalMin)}
              </span>
            )}
          </p>
          <ul className="divide-y rounded-md border text-sm">
            {escalasConEstancia.map((e) => (
              <li key={e.orden} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.direccion}</p>
                  <p className="text-xs text-muted-foreground">
                    Llegó {fechaHora(e.llegadaEn)}
                    {e.salidaEn ? ` · salió ${fechaHora(e.salidaEn)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">
                  {e.estanciaMin != null ? (
                    duracion(e.estanciaMin)
                  ) : (
                    // La estancia sigue abierta: el conductor no ha salido del radio.
                    <span className="text-xs text-muted-foreground">en la escala</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.faltantes.length > 0 && (
        <div className="rounded-md border border-dashed p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Datos que faltan para que el margen sea exacto
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {data.faltantes.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
