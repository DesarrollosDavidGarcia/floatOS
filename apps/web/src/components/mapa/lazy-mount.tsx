'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Monta a sus hijos solo cuando el contenedor entra en el viewport (Intersection
 * Observer). Pensado para diferir la inicialización de un mapa de Google (cada
 * carga de mapa dinámico se factura): si el usuario nunca baja hasta el mapa, no
 * se paga esa carga. Una vez visible, queda montado (no se desmonta al salir de
 * pantalla, para no recargar —y re-facturar— al volver a verlo).
 */
export function LazyMount({
  children,
  placeholder,
  rootMargin = '200px',
}: {
  children: ReactNode;
  placeholder?: ReactNode;
  /** Margen para precargar un poco antes de que sea totalmente visible. */
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return; // ya montado: nada que observar
    const el = ref.current;
    if (!el) return;
    // Sin IntersectionObserver (entornos viejos): monta de inmediato.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className="h-full w-full">
      {visible
        ? children
        : (placeholder ?? (
            <div className="grid h-full place-items-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
              Cargando mapa…
            </div>
          ))}
    </div>
  );
}
