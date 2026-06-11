'use client';

import { useEffect, useState } from 'react';

/**
 * Estado de conectividad de red del navegador.
 * `online`: hay conexión de red ahora mismo.
 */
export function useOnlineStatus() {
  // En SSR asumimos online para no parpadear el banner en la hidratación.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Sincroniza con el estado real al montar.
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { online };
}
