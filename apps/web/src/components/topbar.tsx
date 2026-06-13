'use client';

import { usePathname } from 'next/navigation';
import { NotificationsBell } from '@/components/notifications-bell';
import { UserMenu } from '@/components/user-menu';
import { MobileNav } from '@/components/mobile-nav';

/** Título por sección (el grupo de rutas (panel) no aparece en la URL). */
const TITULOS_SECCION: Record<string, string> = {
  dashboard: 'Panel',
  viajes: 'Viajes',
  flota: 'Flota',
  conductores: 'Conductores',
  clientes: 'Clientes',
  tracking: 'Tracking',
  alertas: 'Alertas',
  catalogos: 'Catálogos',
};

export function Topbar() {
  const pathname = usePathname();
  const seccion = pathname?.split('/').filter(Boolean)[0] ?? '';
  const titulo = TITULOS_SECCION[seccion] ?? 'Panel de administración';

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        {/* Contexto de sección (no es el h1 de la página; ese lo pone PageHeader). */}
        <span className="truncate text-sm font-semibold">{titulo}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NotificationsBell />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
