'use client';

import { useEffect } from 'react';

/**
 * Boundary raíz. Solo se usa si falla el propio layout raíz, por lo que debe
 * renderizar su <html>/<body> y ser totalmente autónomo: sin providers, sin
 * componentes de UI ni utilidades que dependan del contexto de la app.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: '#fafafa',
          color: '#171717',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#525252', margin: '0 0 1.5rem' }}>
            Ocurrió un error inesperado. Intenta de nuevo o recarga la página.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '2.5rem',
              padding: '0 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#171717',
              color: '#fafafa',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
