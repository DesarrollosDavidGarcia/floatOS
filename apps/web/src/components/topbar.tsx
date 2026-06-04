'use client';

import { NotificationsBell } from '@/components/notifications-bell';
import { UserMenu } from '@/components/user-menu';

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
      <div className="text-sm text-muted-foreground">
        Panel de administración
      </div>
      <div className="flex items-center gap-1">
        <NotificationsBell />
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
