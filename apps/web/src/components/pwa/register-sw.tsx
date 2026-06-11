'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker (/sw.js) en producción.
 * En desarrollo no se registra para no interferir con el HMR de Next.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Fallo al registrar el service worker:', err);
      });
    };

    // Esperamos al load para no competir con la carga inicial.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
