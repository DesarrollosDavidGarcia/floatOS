'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import type { MotivoInadecuacion, ResultadoEvaluacion } from '@flotaos/shared-types';
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { evalEscalasPayload, type ViajeFormValues } from './form-types';

const MOTIVO_LABEL: Record<MotivoInadecuacion, string> = {
  SOBREPESO: 'Sobrepeso',
  SOBRE_VOLUMEN: 'Sobre volumen',
  TIPO_INCOMPATIBLE: 'Tipo incompatible',
  AUTONOMIA_INSUFICIENTE: 'Autonomía insuficiente',
  DATOS_INCOMPLETOS: 'Datos incompletos',
};

export function PanelMotor() {
  const { control, setValue } = useFormContext<ViajeFormValues>();
  const escalas = useWatch({ control, name: 'escalas' });
  const unidadId = useWatch({ control, name: 'unidadId' });

  const payload = useMemo(
    () => evalEscalasPayload(escalas ?? []),
    [escalas],
  );
  const tieneCargas = payload.some((e) => (e.cargas?.length ?? 0) > 0);
  const key = useDebounce(JSON.stringify(payload), 600);

  const { data, isFetching } = useQuery<ResultadoEvaluacion>({
    queryKey: ['evaluar-viaje', key],
    queryFn: async () => {
      const { data } = await api.post<ResultadoEvaluacion>('/viajes/evaluar', {
        escalas: JSON.parse(key),
      });
      return data;
    },
    enabled: tieneCargas,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Motor de cálculo</h2>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {!tieneCargas ? (
        <p className="text-xs text-muted-foreground">
          Agrega cargas con peso para evaluar qué unidad es la adecuada.
        </p>
      ) : !data ? (
        <p className="text-xs text-muted-foreground">Calculando…</p>
      ) : (
        <div className="space-y-3">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Resumen valor={`${data.resumen.pesoMaxKg} kg`} etiqueta="Peso máx." />
            <Resumen valor={`${data.resumen.volumenMaxM3} m³`} etiqueta="Volumen máx." />
            <Resumen valor={`${data.resumen.distanciaTotalKm} km`} etiqueta="Distancia" />
          </div>

          {data.resumen.advertencias.map((a, i) => (
            <p key={i} className="flex items-start gap-1 text-xs text-amber-600">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" /> {a}
            </p>
          ))}

          {/* Veredictos */}
          <div className="space-y-1.5">
            {data.veredictos.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay unidades activas para evaluar.</p>
            )}
            {data.veredictos.map((v) => {
              const esRecomendada = v.unidadId === data.recomendada;
              const seleccionada = v.unidadId === unidadId;
              return (
                <div
                  key={v.unidadId}
                  className={`rounded-md border p-2 text-sm ${
                    seleccionada ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {v.apta ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <TriangleAlert className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">{v.placas ?? v.unidadId}</span>
                      {esRecomendada && (
                        <Badge variant="secondary" className="h-5">Recomendada</Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={seleccionada ? 'secondary' : 'outline'}
                      onClick={() => setValue('unidadId', v.unidadId, { shouldValidate: true })}
                    >
                      {seleccionada ? 'Seleccionada' : 'Usar'}
                    </Button>
                  </div>

                  {(v.usoPesoPct != null || v.motivos.length > 0) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {v.usoPesoPct != null && (
                        <span className="text-xs text-muted-foreground">
                          Uso peso {v.usoPesoPct}%
                        </span>
                      )}
                      {v.motivos.map((m, i) => (
                        <Badge
                          key={i}
                          variant={m.codigo === 'DATOS_INCOMPLETOS' ? 'outline' : 'destructive'}
                          className="h-5"
                          title={m.mensaje}
                        >
                          {MOTIVO_LABEL[m.codigo]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Resumen({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="text-sm font-semibold">{valor}</div>
      <div className="text-[11px] text-muted-foreground">{etiqueta}</div>
    </div>
  );
}
