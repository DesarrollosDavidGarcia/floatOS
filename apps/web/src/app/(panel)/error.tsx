'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary del panel. Captura errores no controlados en cualquier ruta
 * bajo (panel) y muestra un estado amigable con opción de reintentar.
 */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Evita filtrar detalles internos al usuario: solo mostramos el mensaje si
  // parece seguro (los errores de Next en producción ocultan el mensaje real).
  const mensaje = error?.message?.trim();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentarlo
          de nuevo; si el problema continúa, recarga la página.
        </p>
        {mensaje ? (
          <p className="max-w-md break-words text-xs text-muted-foreground/80">
            {mensaje}
          </p>
        ) : null}
      </div>
      <Button onClick={() => reset()}>
        <RotateCcw /> Reintentar
      </Button>
    </div>
  );
}
