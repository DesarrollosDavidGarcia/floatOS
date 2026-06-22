'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/topbar';
import { NotificacionesProvider } from '@/lib/notificaciones';
import { rutaPermitida } from '@/lib/navegacion';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const sinAcceso = !!user && !rutaPermitida(user.rol, pathname);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Rol sin acceso a esta ruta: lo mandamos a su inicio (Dashboard).
    if (sinAcceso) router.replace('/dashboard');
  }, [loading, user, sinAcceso, router]);

  if (loading || !user || sinAcceso) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <NotificacionesProvider>
      <div className="flex min-h-screen flex-col bg-muted/30">
        <Topbar />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </NotificacionesProvider>
  );
}
