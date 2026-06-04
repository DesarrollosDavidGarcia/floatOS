'use client';

import { NotificationsBell } from '@/components/notifications-bell';
import { UserMenu } from '@/components/user-menu';
import { MobileNav } from '@/components/mobile-nav';

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <span className="truncate text-sm text-muted-foreground">
          Panel de administración
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NotificationsBell />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
