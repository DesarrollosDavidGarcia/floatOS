'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Building2, MapPin, Pencil, Truck, User } from 'lucide-react';
import { api } from '@/lib/api';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CambiarEstadoDialog } from '@/components/viajes/cambiar-estado-dialog';
import { AsignarDialog } from '@/components/viajes/asignar-dialog';
import { HistorialTimeline } from '@/components/viajes/historial-timeline';
import { TrackingLink } from '@/components/viajes/tracking-link';
import { VeredictoUnidadCard } from '@/components/viajes/veredicto-unidad-card';
import { CotizacionesCard } from '@/components/cotizaciones/cotizaciones-card';
import { PlanRutaDialog } from '@/components/viajes/plan-ruta-dialog';
import { formatearDuracion, planificarRuta } from '@/components/viajes/plan-ruta';
import type { Viaje } from '@/components/viajes/types';

// Mapa con Leaflet: usa `window`, se carga solo en cliente.
const MapaItinerario = dynamic(
  () => import('@/components/viajes/mapa-itinerario'),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

function Dato({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value && value.length ? value : '—'}</dd>
    </div>
  );
}

function fechaLarga(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, "d 'de' MMMM yyyy, HH:mm", { locale: es });
}

export default function ViajeDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: viaje, isLoading, isError } = useQuery<Viaje>({
    queryKey: ['viaje', id],
    queryFn: async () => {
      const { data } = await api.get<Viaje>(`/viajes/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !viaje) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/viajes">
            <ArrowLeft />
            Volver a viajes
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-destructive">
            No se pudo cargar el viaje.
          </CardContent>
        </Card>
      </div>
    );
  }

  const salidaPlan = viaje.fechaProgramada ? new Date(viaje.fechaProgramada) : null;
  const plan =
    salidaPlan &&
    viaje.tiempoEstimadoMin != null &&
    !Number.isNaN(salidaPlan.getTime())
      ? planificarRuta(
          salidaPlan,
          viaje.tiempoEstimadoMin,
          viaje.escalas?.length ?? 0,
          viaje.planRuta,
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/viajes">
            <ArrowLeft />
            Volver a viajes
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold sm:text-2xl">Viaje #{viaje.folio}</h1>
              <Badge variant={ESTADO_VIAJE_BADGE[viaje.estado]}>
                {ESTADO_VIAJE_LABEL[viaje.estado]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Creado el {fechaLarga(viaje.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CambiarEstadoDialog viajeId={viaje.id} estadoActual={viaje.estado} />
            <AsignarDialog
              viajeId={viaje.id}
              unidadIdActual={viaje.unidad?.id ?? viaje.unidadId}
              conductorIdActual={viaje.conductor?.id ?? viaje.conductorId}
            />
            <Button asChild variant="outline">
              <Link href={`/viajes/${viaje.id}/editar`}>
                <Pencil />
                Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itinerario</CardTitle>
              <CardDescription>
                {(viaje.escalas?.length ?? 0)} escala(s) · Fecha programada:{' '}
                {fechaLarga(viaje.fechaProgramada)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Snapshot del motor de cálculo */}
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <Dato label="Distancia" value={viaje.distanciaEstimadaKm != null ? `${viaje.distanciaEstimadaKm} km` : null} />
                <Dato label="Conducción" value={viaje.tiempoEstimadoMin != null ? formatearDuracion(viaje.tiempoEstimadoMin) : null} />
                <Dato label="Peso máx." value={viaje.pesoMaxKg != null ? `${viaje.pesoMaxKg} kg` : null} />
                <Dato label="Volumen máx." value={viaje.volumenMaxM3 != null ? `${viaje.volumenMaxM3} m³` : null} />
              </div>

              {/* Lista de escalas */}
              <ol className="space-y-3">
                {(viaje.escalas ?? []).map((e, i) => (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {i < (viaje.escalas?.length ?? 0) - 1 && (
                        <span className="my-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{e.accion}</Badge>
                        <span className="text-sm font-medium">{e.direccion}</span>
                      </div>
                      {e.cargas.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {e.cargas.map((c) => (
                            <li key={c.id}>
                              {c.sentido === 'DESCARGA' ? '↓ Entrega' : '↑ Recoge'}{' '}
                              {Number(c.pesoKg)} kg · {c.tipoCarga}
                              {c.descripcion ? ` · ${c.descripcion}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {e.notas ? (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">{e.notas}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapa del itinerario</CardTitle>
              <CardDescription>
                Escalas y ruta en orden (origen → destino).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <MapaItinerario
                  escalas={viaje.escalas ?? []}
                  geometria={viaje.rutaGeometria ?? null}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial</CardTitle>
              <CardDescription>Línea de tiempo de cambios de estado.</CardDescription>
            </CardHeader>
            <CardContent>
              <HistorialTimeline historial={viaje.historial ?? []} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Asignación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="font-medium">{viaje.cliente?.razonSocial ?? '—'}</p>
                  {viaje.cliente?.rfc ? (
                    <p className="text-xs text-muted-foreground">{viaje.cliente.rfc}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Unidad</p>
                  <p className="font-medium">
                    {viaje.unidad
                      ? [viaje.unidad.placas, [viaje.unidad.marca, viaje.unidad.modelo]
                          .filter(Boolean)
                          .join(' ')]
                          .filter(Boolean)
                          .join(' · ')
                      : 'Sin asignar'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Conductor</p>
                  <p className="font-medium">{viaje.conductor?.nombre ?? 'Sin asignar'}</p>
                  {viaje.conductor?.telefono ? (
                    <p className="text-xs text-muted-foreground">{viaje.conductor.telefono}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Plan de viaje</CardTitle>
                <CardDescription>Llegada estimada multi-día</CardDescription>
              </div>
              <PlanRutaDialog viaje={viaje} />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {plan ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Llegada estimada
                    </p>
                    <p className="font-medium">{fechaLarga(plan.llegada.toISOString())}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Dato label="Días de conducción" value={`${plan.diasConduccion}`} />
                    <Dato label="Duración total" value={formatearDuracion(plan.totalMin)} />
                    <Dato label="Al volante" value={formatearDuracion(plan.conduccionMin)} />
                    <Dato label="Descansos" value={formatearDuracion(plan.descansoMin)} />
                    <Dato label="Escalas" value={formatearDuracion(plan.servicioMin)} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(viaje.planRuta?.horasConduccionDia ?? 9)} h/día · descanso{' '}
                    {(viaje.planRuta?.horasDescanso ?? 11)} h · {(viaje.planRuta?.minutosPorEscala ?? 60)} min/escala
                    {' '}· inicia {String(viaje.planRuta?.horaInicio ?? 8).padStart(2, '0')}:00
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Asigna una <strong>fecha programada</strong> y calcula la ruta por
                  carretera (TomTom) para estimar la llegada multi-día.
                </p>
              )}
            </CardContent>
          </Card>

          <CotizacionesCard viaje={viaje} />

          <VeredictoUnidadCard viaje={viaje} />

          {viaje.trackingToken ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seguimiento público</CardTitle>
                <CardDescription>
                  Comparte este enlace con el cliente para rastrear el viaje.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackingLink token={viaje.trackingToken} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
