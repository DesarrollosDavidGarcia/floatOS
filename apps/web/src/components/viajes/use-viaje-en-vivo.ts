'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@flotaos/shared-types';
import { getSocket, closeSocket } from '@/lib/socket';
import { toast } from '@/components/ui/sonner';
import type { PosicionViaje, UbicacionEvento } from '@/components/tracking/tipos';

/** Payload del evento WS 'alerta' (geocerca de llegada a una parada). */
interface AlertaEvento {
  tipo?: string;
  viajeId?: string;
  escalaOrden?: number;
}

/**
 * Mantiene el detalle de un viaje sincronizado en tiempo real con la app del
 * conductor: se suscribe a la sala `viaje:<id>` del gateway de tracking y
 * - refresca la query ['viaje', id] cuando el conductor avanza el estado,
 * - devuelve la última posición GPS recibida en vivo (para pintar el camión),
 * - notifica con un toast la llegada a una parada (geocerca).
 */
export function useViajeEnVivo(viajeId: string | undefined): PosicionViaje | null {
  const queryClient = useQueryClient();
  const [posicion, setPosicion] = useState<PosicionViaje | null>(null);

  useEffect(() => {
    if (!viajeId) return;
    setPosicion(null); // no arrastrar la posición de otro viaje (p. ej. tras duplicar)

    const socket = getSocket();
    const suscribir = () => socket.emit('suscribir', { viajeId });
    // Si ya está conectado, suscribe ahora; además re-suscribe en cada reconexión.
    if (socket.connected) suscribir();
    socket.on('connect', suscribir);

    const onUbicacion = (p: UbicacionEvento) => {
      if (p?.viajeId !== viajeId || typeof p.lat !== 'number' || typeof p.lng !== 'number') {
        return;
      }
      setPosicion({
        viajeId,
        lat: p.lat,
        lng: p.lng,
        velocidad: p.velocidad ?? null,
        capturadoEn: p.capturadoEn,
      });
    };

    const onEstado = (p: { viajeId?: string }) => {
      if (p?.viajeId !== viajeId) return;
      // Refresca estado, historial y botones de transición sin recargar.
      void queryClient.invalidateQueries({ queryKey: ['viaje', viajeId] });
    };

    const onAlerta = (p: AlertaEvento) => {
      if (p?.viajeId !== viajeId || p.tipo !== 'llegada_escala') return;
      toast.info(
        p.escalaOrden != null
          ? `El conductor llegó a la parada ${p.escalaOrden + 1}`
          : 'El conductor llegó a una parada',
      );
    };

    socket.on(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
    socket.on(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);
    socket.on(WS_EVENTS.ALERTA, onAlerta);

    return () => {
      socket.off('connect', suscribir);
      socket.off(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
      socket.off(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);
      socket.off(WS_EVENTS.ALERTA, onAlerta);
      socket.emit('desuscribir', { viajeId });
      closeSocket();
    };
  }, [viajeId, queryClient]);

  return posicion;
}
