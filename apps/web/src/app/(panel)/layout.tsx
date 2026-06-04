'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/topbar';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Topbar />
      <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
