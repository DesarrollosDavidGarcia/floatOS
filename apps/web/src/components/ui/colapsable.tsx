'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

/**
 * Sección colapsable con apariencia de tarjeta. La cabecera (título + chevron)
 * alterna el contenido; el slot `derecha` es para una acción que NO togglea.
 * Cerrada por defecto (configurable con `defaultOpen`).
 */
export function Colapsable({
  titulo,
  icono,
  descripcion,
  badge,
  derecha,
  defaultOpen = false,
  children,
  contentClassName,
}: {
  titulo: string;
  /** Icono representativo de la sección, mostrado enseguida del título. */
  icono?: ReactNode;
  descripcion?: string;
  /** Indicador breve junto al título (conteo, ⚠, etc.). */
  badge?: ReactNode;
  /** Acción a la derecha de la cabecera (independiente del toggle). */
  derecha?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open ? '' : '-rotate-90',
            )}
          />
          <span className="text-lg font-semibold leading-none tracking-tight">
            {titulo}
          </span>
          {badge}
        </button>
        {icono ? (
          <span className="shrink-0 text-muted-foreground [&_svg]:size-5">
            {icono}
          </span>
        ) : null}
        {derecha}
      </div>
      {open && (
        <div className={cn('px-6 pb-6', contentClassName)}>
          {descripcion ? (
            <p className="mb-3 text-sm text-muted-foreground">{descripcion}</p>
          ) : null}
          {children}
        </div>
      )}
    </Card>
  );
}
