'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff, Wifi, ServerOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/use-online-status';
import { useApiReachable } from '@/lib/use-api-reachable';
import { cn } from '@/lib/utils';

/**
 * Banner fijo superior que avisa de problemas de conectividad:
 *   - Sin red en el dispositivo (navigator offline).
 *   - Red OK pero el servidor del API no responde (ping a /health).
 * Al recuperar la conexión (red o servidor) muestra brevemente "Conexión
 * restablecida" y refresca todas las consultas para poner el panel al día.
 */
export function ConnectivityBanner() {
  const { online } = useOnlineStatus();
  const { reachable } = useApiReachable(online);
  const queryClient = useQueryClient();

  const connected = online && reachable;
  const prevConnected = useRef(connected);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (connected && !prevConnected.current) {
      // Recuperamos la conexión (red o servidor): avisamos y refrescamos datos.
      setRestored(true);
      void queryClient.invalidateQueries();
      const timer = setTimeout(() => setRestored(false), 3000);
      prevConnected.current = connected;
      return () => clearTimeout(timer);
    }
    prevConnected.current = connected;
  }, [connected, queryClient]);

  const visible = !connected || restored;

  let tone: string;
  let Icon: typeof Wifi;
  let message: string;
  if (!online) {
    tone = 'bg-red-600';
    Icon = WifiOff;
    message = 'Sin conexión — algunos datos pueden no estar actualizados';
  } else if (!reachable) {
    tone = 'bg-amber-600';
    Icon = ServerOff;
    message = 'Sin conexión con el servidor — reintentando…';
  } else {
    tone = 'bg-emerald-600';
    Icon = Wifi;
    message = 'Conexión restablecida';
  }

  return (
    <div
      aria-live="polite"
      role="status"
      className={cn(
        'fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2',
        'px-4 py-2 text-sm font-medium text-white shadow-md',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : '-translate-y-full',
        tone,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
