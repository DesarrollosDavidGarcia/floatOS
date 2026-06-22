'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Container, Copy, MapPin, Pencil, PlayCircle, Siren, Truck, User } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { invalidarViajes } from '@/lib/query-keys';
import { fechaLarga, horaCorta } from '@/lib/fecha';
import { toast } from '@/components/ui/sonner';
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
import { MapaViajeCard } from '@/components/viajes/mapa-viaje-card';
import { ContactosEscalaDialog } from '@/components/viajes/contactos-escala-dialog';
import type { Viaje } from '@/components/viajes/types';
import type { Cotizacion } from '@/components/cotizaciones/types';

function Dato({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value && value.length ? value : '—'}</dd>
    </div>
  );
}

export default function ViajeDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();

  const { data: viaje, isLoading, isError } = useQuery<Viaje>({
    queryKey: ['viaje', id],
    queryFn: async () => {
      const { data } = await api.get<Viaje>(`/viajes/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  // Gating de "gente a cargo": solo con una cotización aceptada. Comparte la
  // misma queryKey que CotizacionesCard, así no se duplica la petición.
  const { data: cotizaciones } = useQuery<Cotizacion[]>({
    queryKey: ['cotizaciones', id],
    queryFn: async () =>
      (await api.get<Cotizacion[]>(`/viajes/${id}/cotizaciones`)).data,
    enabled: Boolean(id),
  });
  const cotizacionAceptada = (cotizaciones ?? []).some(
    (c) => c.estado === 'ACEPTADA',
  );

  const qc = useQueryClient();

  const duplicar = useMutation({
    mutationFn: async () => (await api.post<Viaje>(`/viajes/${id}/duplicar`)).data,
    onSuccess: (nuevo) => {
      toast.success(`Viaje duplicado (#${nuevo.folio})`);
      router.push(`/viajes/${nuevo.id}`);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const reanudar = useMutation({
    mutationFn: async () => (await api.patch(`/viajes/${id}/reanudar`)).data,
    onSuccess: () => {
      toast.success('Viaje reanudado');
      invalidarViajes(qc, id);
    },
    onError: (err) => toast.error(apiError(err)),
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
            {viaje.estado === 'VARADO' && (
              <Button
                onClick={() => reanudar.mutate()}
                disabled={reanudar.isPending}
              >
                <PlayCircle />
                {reanudar.isPending ? 'Reanudando…' : 'Reanudar'}
              </Button>
            )}
            <CambiarEstadoDialog viajeId={viaje.id} estadoActual={viaje.estado} />
            <AsignarDialog
              viajeId={viaje.id}
              estado={viaje.estado}
              unidadIdActual={viaje.unidad?.id ?? viaje.unidadId}
              cajaIdActual={viaje.caja?.id ?? viaje.cajaId}
              conductorIdActual={viaje.conductor?.id ?? viaje.conductorId}
            />
            <Button asChild variant="outline">
              <Link href={`/viajes/${viaje.id}/editar`}>
                <Pencil />
                Editar
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => duplicar.mutate()}
              disabled={duplicar.isPending}
            >
              <Copy />
              {duplicar.isPending ? 'Duplicando…' : 'Duplicar'}
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
                      {/* Personas a cargo: reciben el aviso de llegada por email. */}
                      {(e.contactos?.length || cotizacionAceptada) ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {(e.contactos?.length ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">Avisar a:</span>
                          )}
                          {(e.contactos ?? []).map((c) => (
                            <Badge
                              key={c.id}
                              variant={c.email ? 'secondary' : 'outline'}
                              className="font-normal"
                              title={
                                c.email
                                  ? c.notificadoEn
                                    ? `Avisado el ${fechaLarga(c.notificadoEn)}`
                                    : 'Pendiente de avisar'
                                  : 'Solo celular: aún no recibe aviso (SMS no disponible)'
                              }
                            >
                              {c.nombre}
                              {c.email ? ` · ${c.email}` : ' · solo celular'}
                              {c.email && c.notificadoEn
                                ? ` · ✓ ${horaCorta(c.notificadoEn)}`
                                : ''}
                            </Badge>
                          ))}
                          {cotizacionAceptada && (
                            <ContactosEscalaDialog
                              viajeId={viaje.id}
                              escalaId={e.id}
                              clienteId={viaje.cliente?.id}
                              direccion={e.direccion}
                              contactos={e.contactos ?? []}
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <MapaViajeCard viaje={viaje} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial</CardTitle>
              <CardDescription>Línea de tiempo de cambios de estado.</CardDescription>
            </CardHeader>
            <CardContent>
              <HistorialTimeline historial={viaje.historial ?? []} />
            </CardContent>
          </Card>

          {(viaje.historialAsignaciones?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reasignaciones</CardTitle>
                <CardDescription>
                  Cambios de unidad o conductor (con motivo).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(viaje.historialAsignaciones ?? []).map((h) => (
                  <div key={h.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {h.motivo && <Badge variant="outline">{h.motivo}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {fechaLarga(h.createdAt)}
                        </span>
                      </div>
                    </div>
                    {h.conductorNuevo && (
                      <p className="mt-1">
                        <User className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                        Conductor: <span className="text-muted-foreground">{h.conductorAnterior}</span>{' '}
                        → <span className="font-medium">{h.conductorNuevo}</span>
                      </p>
                    )}
                    {h.unidadNueva && (
                      <p className="mt-1">
                        <Truck className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                        Unidad: <span className="text-muted-foreground">{h.unidadAnterior}</span>{' '}
                        → <span className="font-medium">{h.unidadNueva}</span>
                      </p>
                    )}
                    {h.cajaNueva && (
                      <p className="mt-1">
                        <Container className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                        Caja: <span className="text-muted-foreground">{h.cajaAnterior}</span>{' '}
                        → <span className="font-medium">{h.cajaNueva}</span>
                      </p>
                    )}
                    {h.nota && (
                      <p className="mt-1 text-xs italic text-muted-foreground">{h.nota}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(viaje.incidencias?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Incidencias</CardTitle>
                <CardDescription>
                  Reportes de avería, choque u otros problemas del viaje.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(viaje.incidencias ?? []).map((inc) => {
                  const esCritica =
                    inc.tipo === 'PANICO' || inc.gravedad?.toUpperCase() === 'CRITICA';
                  return (
                  <div
                    key={inc.id}
                    className={cn(
                      'rounded-md border p-3 text-sm',
                      esCritica && !inc.resuelta &&
                        'border-destructive/60 bg-destructive/5',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {esCritica && (
                          <Siren className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <Badge variant="destructive">{inc.tipo}</Badge>
                        <Badge variant="outline">{inc.gravedad}</Badge>
                        {inc.resuelta && <Badge variant="secondary">Resuelta</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {fechaLarga(inc.fecha)}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{inc.titulo}</p>
                    {inc.descripcion && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{inc.descripcion}</p>
                    )}
                    {inc.lugar && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {inc.lugar}
                      </p>
                    )}
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
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
                <Container className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Caja / remolque</p>
                  <p className="font-medium">{viaje.caja?.placas ?? 'Sin asignar'}</p>
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
