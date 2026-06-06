'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EscalaCard } from './escala-card';
import { escalaVacia, type ViajeFormValues } from './form-types';

export function ItinerarioBuilder() {
  const { control, formState: { errors } } = useFormContext<ViajeFormValues>();
  const { fields, insert, remove, move } = useFieldArray({
    control,
    name: 'escalas',
  });

  // El error de nivel array (min 2) llega como errors.escalas.message / root.
  const errorArray =
    (errors.escalas as { message?: string } | undefined)?.message ??
    (errors.escalas as { root?: { message?: string } } | undefined)?.root?.message;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Itinerario</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            // Inserta una parada intermedia justo antes del destino (última).
            insert(
              Math.max(1, fields.length - 1),
              escalaVacia('RECOGER_ENTREGAR', 'CARGA'),
            )
          }
        >
          <Plus className="h-3.5 w-3.5" /> Agregar parada
        </Button>
      </div>

      {errorArray && <p className="text-xs text-destructive">{errorArray}</p>}

      <div className="space-y-3">
        {fields.map((f, index) => (
          <EscalaCard
            key={f.id}
            index={index}
            total={fields.length}
            onRemove={() => remove(index)}
            onMover={(dir) => {
              const dest = index + dir;
              if (dest >= 0 && dest < fields.length) move(index, dest);
            }}
          />
        ))}
      </div>
    </div>
  );
}
