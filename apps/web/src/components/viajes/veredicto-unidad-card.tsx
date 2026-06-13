'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, TriangleAlert } from 'lucide-react';
import type {
  MotivoInadecuacion,
  ResultadoEvaluacion,
} from '@flotaos/shared-types';
import { api } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Viaje } from './types';

const MOTIVO_LABEL: Record<MotivoInadecuacion, string> = {
  SOBREPESO: 'Sobrepeso',
  SOBRE_VOLUMEN: 'Sobre volumen',
  TIPO_INCOMPATIBLE: 'Tipo incompatible',
  AUTONOMIA_INSUFICIENTE: 'Autonomía insuficiente',
  DATOS_INCOMPLETOS: 'Datos incompletos',
};

/** Construye el payload de escalas para /viajes/evaluar desde un viaje cargado. */
function escalasEval(viaje: Viaje) {
  return (viaje.escalas ?? []).map((e) => ({
    accion: e.accion || 'PASO',
    direccion: e.direccion || '—',
    lat: e.lat ?? undefined,
    lng: e.lng ?? undefined,
    cargas: (e.cargas ?? [])
      .filter((c) => Number(c.pesoKg) > 0)
      .map((c) => ({
        sentido: c.sentido,
        tipoCarga: c.tipoCarga,
        pesoKg: Number(c.pesoKg),
        volumenM3: c.volumenM3 != null ? Number(c.volumenM3) : undefined,
      })),
  }));
}

/**
 * Re-ejecuta el motor de cálculo para la unidad asignada al viaje y muestra si
 * es adecuada. Solo se renderiza cuando hay unidad asignada y cargas.
 */
export function VeredictoUnidadCard({ viaje }: { viaje: Viaje }) {
  const unidadId = viaje.unidad?.id ?? viaje.unidadId ?? null;
  const escalas = escalasEval(viaje);
  const hayCargas = escalas.some((e) => e.cargas.length > 0);

  const { data, isLoading } = useQuery<ResultadoEvaluacion>({
    queryKey: ['viaje-veredicto', viaje.id, unidadId],
    queryFn: async () => {
      const { data } = await api.post<ResultadoEvaluacion>('/viajes/evaluar', {
        escalas,
        unidadIds: unidadId ? [unidadId] : [],
      });
      return data;
    },
    enabled: Boolean(unidadId) && hayCargas,
  });

  if (!unidadId || !hayCargas) return null;

  const v = data?.veredictos?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Idoneidad de la unidad</CardTitle>
        <CardDescription>
          Evaluación del motor para la unidad asignada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading || !v ? (
          <p className="text-muted-foreground">Evaluando…</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {v.apta ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-700">Unidad adecuada</span>
                </>
              ) : (
                <>
                  <TriangleAlert className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">No adecuada</span>
                </>
              )}
            </div>
            {v.usoPesoPct != null && (
              <p className="text-muted-foreground">Uso de peso: {v.usoPesoPct}%</p>
            )}
            {v.motivos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {v.motivos.map((m, i) => (
                  <Badge
                    key={i}
                    variant={m.codigo === 'DATOS_INCOMPLETOS' ? 'outline' : 'destructive'}
                    title={m.mensaje}
                  >
                    {MOTIVO_LABEL[m.codigo]}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
