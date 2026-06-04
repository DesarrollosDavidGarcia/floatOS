'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablaVencimientos } from '@/components/alertas/tabla-vencimientos';
import { TablaVencimientosSkeleton } from '@/components/alertas/tabla-skeleton';
import {
  RANGOS_DIAS,
  RANGO_DIAS_DEFAULT,
  type RangoDias,
  type TipoEntidadVencimiento,
  type VencimientoAlerta,
} from '@/components/alertas/tipos';

async function fetchVencimientos(dias: RangoDias): Promise<VencimientoAlerta[]> {
  const { data } = await api.get<VencimientoAlerta[]>('/alertas/vencimientos', {
    params: { dias },
  });
  return data;
}

type FiltroTipo = 'todos' | TipoEntidadVencimiento;

export default function AlertasPage() {
  const [dias, setDias] = useState<RangoDias>(RANGO_DIAS_DEFAULT);
  const [tab, setTab] = useState<FiltroTipo>('todos');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['alertas', 'vencimientos', dias],
    queryFn: () => fetchVencimientos(dias),
  });

  const items = useMemo(() => data ?? [], [data]);

  const unidades = useMemo(() => items.filter((i) => i.tipo === 'unidad'), [items]);
  const conductores = useMemo(
    () => items.filter((i) => i.tipo === 'conductor'),
    [items],
  );

  const itemsFiltrados = useMemo(() => {
    if (tab === 'unidad') return unidades;
    if (tab === 'conductor') return conductores;
    return items;
  }, [tab, items, unidades, conductores]);

  return (
    <div className="space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Alertas"
        description="Centro de vencimientos de documentos de unidades y conductores."
        action={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rango</span>
            <Select
              value={String(dias)}
              onValueChange={(value) => setDias(Number(value) as RangoDias)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGOS_DIAS.map((opcion) => (
                  <SelectItem key={opcion} value={String(opcion)}>
                    Próximos {opcion} días
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* ── Tabs + contenido ───────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as FiltroTipo)}>
        {/* Barra: tabs a la izquierda, conteo a la derecha */}
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="todos">
              Todos
              <Badge variant="secondary" className="ml-2">
                {items.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unidad">
              Unidades
              <Badge variant="secondary" className="ml-2">
                {unidades.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="conductor">
              Conductores
              <Badge variant="secondary" className="ml-2">
                {conductores.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Conteo de registros del tab activo (solo cuando hay datos) */}
          {!isLoading && !isError && (
            <p className="text-sm text-muted-foreground">
              {itemsFiltrados.length}{' '}
              {itemsFiltrados.length === 1 ? 'por vencer' : 'por vencer'}
            </p>
          )}
        </div>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <TablaVencimientosSkeleton />
          ) : isError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {apiError(error) || 'No se pudieron cargar los vencimientos.'}
            </div>
          ) : (
            <TablaVencimientos items={itemsFiltrados} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
