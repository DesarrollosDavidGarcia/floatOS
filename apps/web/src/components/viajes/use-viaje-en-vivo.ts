'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@flotaos/shared-types';
import { getSocket } from '@/lib/socket';
import type { PosicionViaje, UbicacionEvento } from '@/components/tracking/tipos';

/**
 * Mantiene el detalle de un viaje sincronizado en tiempo real con la app del
 * conductor: se suscribe a la sala `viaje:<id>` del gateway de tracking y
 * - refresca la query ['viaje', id] cuando el conductor avanza el estado,
 * - devuelve la última posición GPS recibida en vivo (para pintar el camión).
 *
 * Las alertas de llegada (geocerca) las maneja el proveedor global de
 * notificaciones (ver lib/notificaciones), no este hook, para no duplicar avisos.
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

    socket.on(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
    socket.on(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);

    return () => {
      socket.off('connect', suscribir);
      socket.off(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
      socket.off(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);
      socket.emit('desuscribir', { viajeId });
      // No se cierra el socket: es un singleton de sesión que el proveedor global
      // de notificaciones mantiene vivo para escuchar llegadas en todo el panel.
    };
  }, [viajeId, queryClient]);

  return posicion;
}
