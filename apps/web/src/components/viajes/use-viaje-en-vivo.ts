'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@flotaos/shared-types';
import { getSocket, suscribirViaje, desuscribirViaje } from '@/lib/socket';
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
    // Suscripción con refcount: el socket es un singleton compartido (chat,
    // notificaciones, otros detalles). suscribirViaje emite 'suscribir' solo
    // para el primer consumidor de esta sala; si ya está conectado, surte efecto
    // de inmediato (suscribirViaje internamente obtiene el socket y emite).
    suscribirViaje(viajeId);
    // En cada reconexión el servidor pierde la membresía de sala: re-emitimos
    // 'suscribir' directamente (sin tocar el refcount, que ya cuenta a este
    // consumidor) para volver a entrar a la sala.
    const reSuscribir = () => socket.emit('suscribir', { viajeId });
    socket.on('connect', reSuscribir);

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
      socket.off('connect', reSuscribir);
      socket.off(WS_EVENTS.UBICACION_ACTUALIZADA, onUbicacion);
      socket.off(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, onEstado);
      // Refcount: solo emite 'desuscribir' cuando ningún otro consumidor sigue
      // suscrito a esta sala, para no cortar el realtime de chat/otros paneles.
      desuscribirViaje(viajeId);
      // No se cierra el socket: es un singleton de sesión que el proveedor global
      // de notificaciones mantiene vivo para escuchar llegadas en todo el panel.
    };
  }, [viajeId, queryClient]);

  return posicion;
}
