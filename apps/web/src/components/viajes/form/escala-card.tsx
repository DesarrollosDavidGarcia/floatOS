'use client';

import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ArrowDown, ArrowUp, MapPinned, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { MapPickerDialog } from '@/components/mapa/map-picker-dialog';
import type { ViajeFormValues } from './form-types';

function etiquetaPosicion(index: number, total: number): string {
  if (index === 0) return 'Origen';
  if (index === total - 1) return 'Destino';
  return `Parada ${index}`;
}

export function EscalaCard({
  index,
  total,
  onRemove,
  onMover,
}: {
  index: number;
  total: number;
  onRemove: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  const { register, watch, setValue, formState: { errors } } =
    useFormContext<ViajeFormValues>();
  const [mapOpen, setMapOpen] = useState(false);

  const base = `escalas.${index}` as const;
  const accion = watch(`${base}.accion`);
  const direccion = watch(`${base}.direccion`);
  const lat = watch(`${base}.lat`);
  const lng = watch(`${base}.lng`);
  const errEscala = errors.escalas?.[index];

  const cargas = useFieldArray({ name: `${base}.cargas` });

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {etiquetaPosicion(index, total)}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Subir"
            disabled={index === 0} onClick={() => onMover(-1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Bajar"
            disabled={index === total - 1} onClick={() => onMover(1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Eliminar escala"
            disabled={total <= 2} onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <CamposGrid cols={2}>
        <Campo label="Acción" htmlFor={`${base}.accion`} required error={errEscala?.accion?.message}>
          <CatalogoSelect
            id={`${base}.accion`}
            grupo="ACCION_ESCALA"
            value={accion}
            onChange={(v) => setValue(`${base}.accion`, v, { shouldValidate: true })}
          />
        </Campo>
        <Campo label="Dirección" htmlFor={`${base}.direccion`} required error={errEscala?.direccion?.message}>
          <div className="flex gap-2">
            <Input id={`${base}.direccion`} {...register(`${base}.direccion`)} placeholder="Dirección de la parada" />
            <Button type="button" variant="outline" size="icon" aria-label="Elegir en mapa"
              onClick={() => setMapOpen(true)}>
              <MapPinned className="h-4 w-4" />
            </Button>
          </div>
        </Campo>
      </CamposGrid>

      {lat != null && lng != null && (
        <p className="mt-1 text-xs text-muted-foreground">
          📍 {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}

      {/* Cargas de la escala */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Cargas en esta parada</span>
          <Button type="button" variant="outline" size="sm"
            onClick={() => cargas.append({ sentido: 'CARGA', tipoCarga: 'GENERAL', descripcion: '', pesoKg: '', volumenM3: '', cantidad: '' })}>
            <Plus className="h-3.5 w-3.5" /> Carga
          </Button>
        </div>

        {cargas.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin movimientos de carga (parada de paso).</p>
        )}

        {cargas.fields.map((f, j) => {
          const cb = `${base}.cargas.${j}` as const;
          const errC = errEscala?.cargas?.[j];
          return (
            <div key={f.id} className="rounded-md border border-dashed p-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                <Campo label="Sentido" htmlFor={`${cb}.sentido`}>
                  <CatalogoSelect id={`${cb}.sentido`} grupo="SENTIDO_CARGA"
                    value={watch(`${cb}.sentido`)}
                    onChange={(v) => setValue(`${cb}.sentido`, v)} />
                </Campo>
                <Campo label="Tipo" htmlFor={`${cb}.tipoCarga`} error={errC?.tipoCarga?.message}>
                  <CatalogoSelect id={`${cb}.tipoCarga`} grupo="TIPO_CARGA"
                    value={watch(`${cb}.tipoCarga`)}
                    onChange={(v) => setValue(`${cb}.tipoCarga`, v, { shouldValidate: true })} />
                </Campo>
                <Campo label="Peso (kg)" htmlFor={`${cb}.pesoKg`} error={errC?.pesoKg?.message}>
                  <Input id={`${cb}.pesoKg`} type="number" step="any" min="0" {...register(`${cb}.pesoKg`)} />
                </Campo>
                <Campo label="Vol. (m³)" htmlFor={`${cb}.volumenM3`}>
                  <Input id={`${cb}.volumenM3`} type="number" step="any" min="0" {...register(`${cb}.volumenM3`)} />
                </Campo>
              </div>
              <div className="mt-1 flex items-end gap-2">
                <div className="flex-1">
                  <Campo label="Descripción" htmlFor={`${cb}.descripcion`}>
                    <Input id={`${cb}.descripcion`} {...register(`${cb}.descripcion`)} placeholder="Opcional" />
                  </Campo>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar carga"
                  onClick={() => cargas.remove(j)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <MapPickerDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        inicial={{ direccion, lat, lng }}
        titulo={`Ubicación · ${etiquetaPosicion(index, total)}`}
        onConfirm={(u) => {
          setValue(`${base}.direccion`, u.direccion, { shouldValidate: true });
          setValue(`${base}.lat`, u.lat);
          setValue(`${base}.lng`, u.lng);
        }}
      />
    </div>
  );
}
