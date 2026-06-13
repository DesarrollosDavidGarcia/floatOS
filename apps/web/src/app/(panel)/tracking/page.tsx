'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { MapPin, RadioTower, Truck } from 'lucide-react';
import { EstadoViaje, WS_EVENTS, type Paginado } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL, ESTADOS_ACTIVOS } from '@/lib/estado-viaje';
import { getSocket, closeSocket } from '@/lib/socket';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import type {
  PosicionViaje,
  UbicacionEvento,
  ViajeActivo,
} from '@/components/tracking/tipos';

// El mapa usa Leaflet (window) — debe cargarse sólo en cliente.
const Mapa = dynamic(() => import('@/components/tracking/mapa'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
      <span className="text-sm text-muted-foreground">Cargando mapa…</span>
    </div>
  ),
});

/** Payload del evento WS 'viaje:estado' (ver cambiar-estado-viaje.usecase). */
interface CambioEstadoEvento {
  viajeId: string;
  estadoNuevo: EstadoViaje;
}

async function cargarViajesActivos(): Promise<ViajeActivo[]> {
  const { data } = await api.get<Paginado<ViajeActivo>>('/viajes', {
    params: { pageSize: 100 },
  });
  return data.data.filter((v) => ESTADOS_ACTIVOS.includes(v.estado));
}

/** Posición inicial de un viaje: detalle -> trackingToken -> última ubicación pública. */
async function cargarPosicionInicial(viajeId: string): Promise<PosicionViaje | null> {
  try {
    const { data: detalle } = await api.get<{ trackingToken?: string }>(`/viajes/${viajeId}`);
    if (!detalle.trackingToken) return null;
    const { data: pub } = await api.get<{
      ultimaUbicacion?: { lat: number; lng: number; velocidad: number | null; capturadoEn: string } | null;
    }>(`/tracking/${detalle.trackingToken}`);
    const u = pub.ultimaUbicacion;
    if (!u) return null;
    return { viajeId, lat: u.lat, lng: u.lng, velocidad: u.velocidad ?? null, capturadoEn: u.capturadoEn };
  } catch {
    return null;
  }
}

export default function TrackingPage() {
  const [posiciones, setPosiciones] = useState<Record<string, PosicionViaje>>({});
  const [estadosVivo, setEstadosVivo] = useState<Record<string, EstadoViaje>>({});
  const [enfoque, setEnfoque] = useState<{ lat: number; lng: number } | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const {
    data: viajesRaw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tracking', 'viajes-activos'],
    queryFn: cargarViajesActivos,
    refetchInterval: 60_000,
  });

  // Aplica los cambios de estado recibidos por WS sobre el listado base.
  const viajes = useMemo<ViajeActivo[]>(() => {
    const base = viajesRaw ?? [];
    return base
      .map((v) => ({ ...v, estado: estadosVivo[v.id] ?? v.estado }))
      .filter((v) => ESTADOS_ACTIVOS.includes(v.estado));
  }, [viajesRaw, estadosVivo]);

  // Conecta el socket, se suscribe a cada viaje y escucha eventos en vivo.
  useEffect(() => {
    if (!viajesRaw || viajesRaw.length === 0) return;

    const socket = getSocket();

    const suscribirTodos = () => {
      for (const viaje of viajesRaw) {
        socket.emit('suscribir', { viajeId: viaje.id });
      }
    };

    // Si ya está conectado, suscribe ahora; además re-suscribe en cada reconexión.
    if (socket.connected) suscribirTodos();
    socket.on('connect', suscribirTodos);

    const onUbicacion = (payload: UbicacionEvento) => {
      if (
        !payload ||
        typeof payload.lat !== 'number' ||
        typeof payload.lng !== 'number' ||
        !payload.viajeId
      ) {
        return;
      }
      setPosiciones((prev) => ({
        ...prev,
        [payload.viajeId]: {
          viajeId: payload.viajeId,
          lat: payload.lat,
          lng: payload.lng,
          velocidad: payload.velocidad ?? null,
          capturadoEn: payload.capturadoEn,
        },
      }));
    };

    const onEstado = (payload: CambioEstadoEvento) => {
      if (!payload?.viajeId || !payload.estadoNuevo) return;
      setEstadosVivo((prev) => ({ ...prev, [payload.viajeId]: payload.estadoNuevo }));
    };

    socket.on(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
    socket.on(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);

    return () => {
      socket.off('connect', suscribirTodos);
      socket.off(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
      socket.off(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);
    };
  }, [viajesRaw]);

  // Carga la última posición conocida de cada viaje activo (sin esperar a un
  // evento en vivo). Los updates por WS posteriores la sobrescriben.
  useEffect(() => {
    if (!viajesRaw || viajesRaw.length === 0) return;
    let cancelado = false;
    void (async () => {
      const resultados = await Promise.all(viajesRaw.map((v) => cargarPosicionInicial(v.id)));
      if (cancelado) return;
      setPosiciones((prev) => {
        const next = { ...prev };
        for (const pos of resultados) {
          if (pos && !next[pos.viajeId]) next[pos.viajeId] = pos;
        }
        return next;
      });
    })();
    return () => {
      cancelado = true;
    };
  }, [viajesRaw]);

  // Limpia el socket por completo al salir de la vista.
  useEffect(() => {
    return () => closeSocket();
  }, []);

  const handleSeleccion = (viaje: ViajeActivo) => {
    setSeleccionado(viaje.id);
    const pos = posiciones[viaje.id];
    if (pos) {
      setEnfoque({ lat: pos.lat, lng: pos.lng });
    } else if (viaje.origenLat != null && viaje.origenLng != null) {
      setEnfoque({ lat: viaje.origenLat, lng: viaje.origenLng });
    } else {
      toast.error('Aún no hay ubicación para este viaje');
    }
  };

  const conPosicion = useMemo(
    () => viajes.filter((v) => posiciones[v.id]).length,
    [viajes, posiciones],
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader
        title="Mapa en vivo"
        description="Seguimiento en tiempo real de los viajes activos."
        action={
          <Badge variant="outline" className="gap-1.5">
            <RadioTower className="h-3.5 w-3.5" />
            {viajes.length} activos · {conPosicion} con señal
          </Badge>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Lista lateral de viajes activos */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : isError ? (
              <p className="p-4 text-sm text-destructive">{apiError(error)}</p>
            ) : viajes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <Truck className="h-8 w-8 opacity-50" />
                No hay viajes activos en este momento.
              </div>
            ) : (
              <ul className="space-y-1">
                {viajes.map((viaje) => {
                  const tieneSenal = Boolean(posiciones[viaje.id]);
                  const conductor = viaje.conductor
                    ? `${viaje.conductor.nombre} ${viaje.conductor.apellidos}`.trim()
                    : 'Sin conductor';
                  return (
                    <li key={viaje.id}>
                      <button
                        type="button"
                        onClick={() => handleSeleccion(viaje)}
                        className={cn(
                          'w-full rounded-md border p-3 text-left transition-colors hover:bg-accent',
                          seleccionado === viaje.id
                            ? 'border-primary bg-accent'
                            : 'border-transparent',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">Viaje #{viaje.folio}</span>
                          <Badge variant={ESTADO_VIAJE_BADGE[viaje.estado]}>
                            {ESTADO_VIAJE_LABEL[viaje.estado]}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {viaje.cliente?.razonSocial ?? 'Sin cliente'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {conductor}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs">
                          <span
                            className={cn(
                              'inline-block h-2 w-2 rounded-full',
                              tieneSenal ? 'bg-green-500' : 'bg-muted-foreground/40',
                            )}
                          />
                          <span className="text-muted-foreground">
                            {tieneSenal ? 'Recibiendo ubicación' : 'Sin señal'}
                          </span>
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Mapa */}
        <div className="min-h-[24rem] overflow-hidden rounded-lg border">
          <Mapa viajes={viajes} posiciones={posiciones} enfoque={enfoque} />
        </div>
      </div>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        Origen (azul) y destino (verde) se muestran cuando el viaje tiene
        coordenadas. El punto rojo es la posición actual del conductor.
      </p>
    </div>
  );
}
