'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Clock,
  Container,
  Copy,
  History,
  MapPin,
  Pencil,
  PlayCircle,
  Receipt,
  Route,
  Share2,
  Siren,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { invalidarViajes } from '@/lib/query-keys';
import { fechaLarga, horaCorta } from '@/lib/fecha';
import { toast } from '@/components/ui/sonner';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Colapsable } from '@/components/ui/colapsable';
import { Skeleton } from '@/components/ui/skeleton';
import { CambiarEstadoDialog } from '@/components/viajes/cambiar-estado-dialog';
import { AsignarDialog } from '@/components/viajes/asignar-dialog';
import { HistorialTimeline } from '@/components/viajes/historial-timeline';
import { TrackingLink } from '@/components/viajes/tracking-link';
import { VeredictoUnidadCard } from '@/components/viajes/veredicto-unidad-card';
import { CotizacionesCard } from '@/components/cotizaciones/cotizaciones-card';
import { ChatViaje } from '@/components/chat/chat-viaje';
import { PlanRutaDialog } from '@/components/viajes/plan-ruta-dialog';
import { formatearDuracion, planificarRuta } from '@/components/viajes/plan-ruta';
import { ContactosEscalaDialog } from '@/components/viajes/contactos-escala-dialog';
import { ManifiestoDialog } from '@/components/viajes/manifiesto-dialog';
import type { Viaje } from '@/components/viajes/types';
import type { Cotizacion } from '@/components/cotizaciones/types';

// La tarjeta del mapa monta el SDK de Google Maps (usa `window`): se carga solo
// en cliente y fuera del bundle inicial de la ruta.
const MapaViajeCard = dynamic(
  () => import('@/components/viajes/mapa-viaje-card').then((m) => m.MapaViajeCard),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-80 w-full place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
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

/** Dato clave inline de la cabecera (icono + texto). */
function ClaveInline({
  icon: Icon,
  children,
}: {
  icon: typeof Truck;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </span>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
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

  const escalas = viaje.escalas ?? [];
  const pasajeros = viaje.pasajeros ?? [];
  const esPersonal = viaje.tipoServicio === 'PERSONAL';
  const paradaLabel = (id?: string | null): string | null => {
    if (!id) return null;
    const e = escalas.find((x) => x.id === id);
    if (!e) return null;
    if (e.orden === 0) return 'Origen';
    if (e.orden === escalas.length - 1) return 'Destino';
    return `Parada ${e.orden}`;
  };
  const reasignaciones = viaje.historialAsignaciones ?? [];
  const incidencias = viaje.incidencias ?? [];
  const hayIncidenciaCritica = incidencias.some(
    (i) =>
      (i.tipo === 'PANICO' || i.gravedad?.toUpperCase() === 'CRITICA') &&
      !i.resuelta,
  );
  const hayCargas = escalas.some((e) => (e.cargas ?? []).length > 0);
  const tieneUnidad = Boolean(viaje.unidad?.id ?? viaje.unidadId);

  return (
    <div className="space-y-6">
      {/* Cabecera compacta: estado + datos clave + acciones */}
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/viajes">
            <ArrowLeft />
            Volver a viajes
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold sm:text-2xl">Viaje #{viaje.folio}</h1>
              <Badge variant={ESTADO_VIAJE_BADGE[viaje.estado]}>
                {ESTADO_VIAJE_LABEL[viaje.estado]}
              </Badge>
              <Badge variant={viaje.tipoServicio === 'PERSONAL' ? 'default' : 'outline'}>
                {viaje.tipoServicio === 'PERSONAL' ? 'Personal' : 'Carga'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <ClaveInline icon={Building2}>
                {viaje.cliente?.razonSocial ?? '—'}
              </ClaveInline>
              <ClaveInline icon={Truck}>
                {viaje.unidad?.placas ?? 'Sin unidad'}
              </ClaveInline>
              <ClaveInline icon={User}>
                {viaje.conductor?.nombre ?? 'Sin conductor'}
              </ClaveInline>
              {viaje.tipoServicio === 'PERSONAL' && viaje.numPasajeros != null && (
                <ClaveInline icon={Users}>
                  {viaje.numPasajeros} pasajero(s)
                </ClaveInline>
              )}
              {plan ? (
                <ClaveInline icon={Clock}>
                  ETA {fechaLarga(plan.llegada.toISOString())}
                </ClaveInline>
              ) : null}
            </div>
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

      {/* Esencial del monitoreo: mapa en vivo + chat, siempre visibles */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <MapaViajeCard viaje={viaje} />
        <ChatViaje viajeId={viaje.id} />
      </div>

      {/* Secciones de detalle, colapsables (cerradas por defecto), en cuadrícula
          de 3 columnas (1 en móvil, 2 en tablet). `items-start` evita que una
          sección expandida estire a sus vecinas del mismo renglón. */}
      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Colapsable
          titulo="Itinerario"
          icono={<Route className="h-4 w-4" />}
          descripcion={`${escalas.length} escala(s) · Programada: ${fechaLarga(viaje.fechaProgramada)}`}
        >
          <div className="space-y-4">
            {/* Snapshot del motor de cálculo */}
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <Dato label="Distancia" value={viaje.distanciaEstimadaKm != null ? `${viaje.distanciaEstimadaKm} km` : null} />
              <Dato label="Conducción" value={viaje.tiempoEstimadoMin != null ? formatearDuracion(viaje.tiempoEstimadoMin) : null} />
              <Dato label="Peso máx." value={viaje.pesoMaxKg != null ? `${viaje.pesoMaxKg} kg` : null} />
              <Dato label="Volumen máx." value={viaje.volumenMaxM3 != null ? `${viaje.volumenMaxM3} m³` : null} />
            </div>

            {/* Lista de escalas */}
            <ol className="space-y-3">
              {escalas.map((e, i) => (
                <li key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {i < escalas.length - 1 && (
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
          </div>
        </Colapsable>

        <Colapsable titulo="Asignación" icono={<Truck className="h-4 w-4" />}>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
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
          </div>
        </Colapsable>

        {esPersonal && (
          <Colapsable
            titulo="Pasajeros"
            icono={<Users className="h-4 w-4" />}
            descripcion={`${pasajeros.length} en el manifiesto${
              viaje.numPasajeros ? ` · ${viaje.numPasajeros} esperados` : ''
            }`}
            derecha={
              <ManifiestoDialog
                viajeId={viaje.id}
                pasajeros={pasajeros}
                escalas={escalas}
              />
            }
            defaultOpen
          >
            {pasajeros.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay pasajeros en el manifiesto.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {pasajeros.map((p) => {
                  const parada = paradaLabel(p.escalaId);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{p.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[p.identificacion, p.telefono]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                      {parada && <Badge variant="outline">{parada}</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Colapsable>
        )}

        <Colapsable
          titulo="Plan de viaje"
          icono={<CalendarClock className="h-4 w-4" />}
          descripcion="Llegada estimada multi-día"
          derecha={<PlanRutaDialog viaje={viaje} />}
        >
          <div className="space-y-3 text-sm">
            {plan ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Llegada estimada
                  </p>
                  <p className="font-medium">{fechaLarga(plan.llegada.toISOString())}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          </div>
        </Colapsable>

        <Colapsable titulo="Cotización" icono={<Receipt className="h-4 w-4" />}>
          <CotizacionesCard viaje={viaje} plano />
        </Colapsable>

        <Colapsable
          titulo="Historial"
          icono={<History className="h-4 w-4" />}
          descripcion="Línea de tiempo de cambios de estado."
        >
          <HistorialTimeline historial={viaje.historial ?? []} />
        </Colapsable>

        {reasignaciones.length > 0 && (
          <Colapsable
            titulo="Reasignaciones"
            icono={<ArrowLeftRight className="h-4 w-4" />}
            descripcion="Cambios de unidad o conductor (con motivo)."
            badge={<Badge variant="secondary">{reasignaciones.length}</Badge>}
          >
            <div className="space-y-3">
              {reasignaciones.map((h) => (
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
            </div>
          </Colapsable>
        )}

        {incidencias.length > 0 && (
          <Colapsable
            titulo="Incidencias"
            icono={<Siren className="h-4 w-4" />}
            descripcion="Reportes de avería, choque u otros problemas del viaje."
            defaultOpen={hayIncidenciaCritica}
            badge={
              <Badge variant={hayIncidenciaCritica ? 'destructive' : 'secondary'}>
                {hayIncidenciaCritica ? '⚠ ' : ''}
                {incidencias.length}
              </Badge>
            }
          >
            <div className="space-y-3">
              {incidencias.map((inc) => {
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
            </div>
          </Colapsable>
        )}

        {tieneUnidad && hayCargas && (
          <Colapsable
            titulo="Idoneidad de la unidad"
            icono={<BadgeCheck className="h-4 w-4" />}
          >
            <VeredictoUnidadCard viaje={viaje} plano />
          </Colapsable>
        )}

        {viaje.trackingToken ? (
          <Colapsable
            titulo="Seguimiento público"
            icono={<Share2 className="h-4 w-4" />}
            descripcion="Comparte este enlace con el cliente para rastrear el viaje."
          >
            <TrackingLink token={viaje.trackingToken} />
          </Colapsable>
        ) : null}
      </div>
    </div>
  );
}
