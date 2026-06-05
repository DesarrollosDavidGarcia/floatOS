'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, Building2, Truck, User } from 'lucide-react';
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
import { EditarViajeDialog } from '@/components/viajes/editar-viaje-dialog';
import { HistorialTimeline } from '@/components/viajes/historial-timeline';
import { TrackingLink } from '@/components/viajes/tracking-link';
import type { Viaje } from '@/components/viajes/types';

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
            <ArrowLeft className="mr-2 h-4 w-4" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/viajes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a viajes
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Viaje #{viaje.folio}</h1>
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
            <EditarViajeDialog viaje={viaje} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ruta y carga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span>{viaje.origenDireccion}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>{viaje.destinoDireccion}</span>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Dato label="Tipo de carga" value={viaje.tipoCarga} />
                <Dato
                  label="Peso"
                  value={viaje.pesoKg != null ? `${viaje.pesoKg} kg` : null}
                />
                <Dato label="Dimensiones" value={viaje.dimensiones} />
                <Dato label="Fecha programada" value={fechaLarga(viaje.fechaProgramada)} />
                <div className="sm:col-span-2">
                  <Dato label="Descripción" value={viaje.descripcionCarga} />
                </div>
              </dl>
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
                  <p className="font-medium">{viaje.cliente?.nombre ?? '—'}</p>
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
