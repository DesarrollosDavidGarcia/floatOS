'use client';

import { Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { etiquetaDias } from '@/lib/vencimiento';
import { fechaCorta } from '@/lib/fecha';
import { documentoLabel, urgenciaBadge } from './etiquetas';
import type { AlertaVencimiento } from './tipos';

export function VencimientosCard({
  vencimientos,
  loading,
}: {
  vencimientos: AlertaVencimiento[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Próximos vencimientos</CardTitle>
        <CardDescription>Documentos por vencer en los próximos 30 días.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : vencimientos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay documentos por vencer.
          </p>
        ) : (
          <ul className="divide-y">
            {vencimientos.map((v, i) => {
              const Icon = v.tipo === 'unidad' ? Truck : User;
              return (
                <li
                  key={`${v.tipo}-${v.entidad}-${v.tipoDocumento}-${i}`}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.entidad}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {documentoLabel(v.tipoDocumento)} · {fechaCorta(v.fechaVencimiento)}
                    </p>
                  </div>
                  <Badge variant={urgenciaBadge(v.diasRestantes)} className="shrink-0">
                    {etiquetaDias(v.diasRestantes)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
