import { Skeleton } from '@/components/ui/skeleton';

export function TablaVencimientosSkeleton() {
  return (
    <div className="rounded-md border">
      {/* header row */}
      <div className="flex h-9 items-center gap-4 border-b px-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="ml-auto h-3 w-28" />
      </div>
      {/* data rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
          {/* entidad (2 líneas) */}
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* tipo badge */}
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
          {/* documento */}
          <Skeleton className="h-4 w-32 shrink-0" />
          {/* vigencia (badge + fecha) */}
          <div className="ml-auto flex flex-col items-end gap-1">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
