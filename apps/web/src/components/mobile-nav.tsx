'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarContent } from '@/components/sidebar';

/**
 * Navegación principal: botón hamburguesa (en todos los tamaños) que abre el
 * sidebar como un panel deslizante a la izquierda. Se cierra al navegar o
 * tocar el fondo.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el drawer al cambiar de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Evita el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card shadow-xl animate-in slide-in-from-left">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-3 z-10"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
