'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Container,
  Users,
  Building2,
  BellRing,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GRUPOS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/viajes', label: 'Viajes', icon: Truck },
      { href: '/tracking', label: 'Mapa en vivo', icon: MapPin },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/flota', label: 'Flota', icon: Container },
      { href: '/conductores', label: 'Conductores', icon: Users },
      { href: '/clientes', label: 'Clientes', icon: Building2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/alertas', label: 'Alertas', icon: BellRing },
      { href: '/catalogos', label: 'Catálogos', icon: ListChecks },
    ],
  },
];

/** Contenido del sidebar (marca + navegación + footer), reutilizable en el
 *  drawer móvil. `onNavigate` se llama al hacer clic en un enlace (para cerrar). */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Truck className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">FlotaOS</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {GRUPOS.map((grupo) => (
          <div key={grupo.label} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {grupo.label}
            </p>
            {grupo.items.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t px-4 py-3 text-xs text-muted-foreground">
        FlotaOS · v1.0
      </div>
    </>
  );
}

/** Sidebar fijo de escritorio (oculto en móvil; en móvil se usa MobileNav). */
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <SidebarContent />
    </aside>
  );
}
