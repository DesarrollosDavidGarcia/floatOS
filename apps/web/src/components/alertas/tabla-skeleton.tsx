import { Skeleton } from '@/components/ui/skeleton';

export function TablaVencimientosSkeleton() {
  return (
    <div className="space-y-3 rounded-md border p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="ml-auto h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
