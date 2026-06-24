import {
  LayoutDashboard,
  Truck,
  MapPin,
  Container,
  Users,
  Building2,
  BellRing,
  ListChecks,
  Settings,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

import { RolUsuario } from '@flotaos/shared-types';

export { RolUsuario };
/** @deprecated Usar `RolUsuario` de `@flotaos/shared-types`. */
export type Rol = RolUsuario;

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles con acceso. Si se omite, lo ven todos los admins (ADMIN y MONITORISTA). */
  roles?: Rol[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Solo admin: secciones de gestión/configuración que el monitorista no usa. */
const SOLO_ADMIN: Rol[] = ['ADMIN'];

export const GRUPOS: NavGroup[] = [
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
      { href: '/conductores', label: 'Conductores', icon: Users, roles: SOLO_ADMIN },
      { href: '/clientes', label: 'Clientes', icon: Building2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/alertas', label: 'Alertas', icon: BellRing, roles: SOLO_ADMIN },
      { href: '/catalogos', label: 'Catálogos', icon: ListChecks, roles: SOLO_ADMIN },
      { href: '/usuarios', label: 'Usuarios', icon: UserCog, roles: SOLO_ADMIN },
      { href: '/configuracion', label: 'Configuración', icon: Settings, roles: SOLO_ADMIN },
    ],
  },
];

/** Todos los items en una sola lista (para resolver rutas). */
const NAV_ITEMS = GRUPOS.flatMap((g) => g.items);

/** True si el item es visible para el rol dado (sin `roles` => visible para todos). */
export function itemVisible(item: NavItem, rol: Rol | undefined): boolean {
  if (!item.roles) return true;
  return rol !== undefined && item.roles.includes(rol);
}

/**
 * ¿El rol puede acceder a la ruta? Busca el item de navegación cuyo href sea
 * prefijo del pathname. Rutas sin item asociado se permiten (la seguridad real
 * la impone la API; este chequeo es de UX/navegación).
 */
export function rutaPermitida(rol: Rol | undefined, pathname: string): boolean {
  // El match más específico gana (href más largo) por si hay solapamientos.
  const match = NAV_ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return true;
  return itemVisible(match, rol);
}
