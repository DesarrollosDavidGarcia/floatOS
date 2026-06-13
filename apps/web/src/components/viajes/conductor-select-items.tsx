'use client';

import { Badge } from '@/components/ui/badge';
import { SelectItem } from '@/components/ui/select';
import { ESTADO_VIAJE_BADGE, ESTADO_VIAJE_LABEL } from '@/lib/estado-viaje';
import type { OpcionConductor } from './catalogos';

/**
 * Opciones del selector de conductor con chip de disponibilidad:
 * - "Disponible" (verde) si no tiene viaje abierto → seleccionable.
 * - El estado de su viaje en curso (p. ej. "En tránsito · #7") si está
 *   ocupado → deshabilitado (espejo del 409 del backend).
 * - "Este viaje" si su viaje abierto es el que se está editando/asignando
 *   → seleccionable (reasignarlo a sí mismo no es conflicto).
 *
 * Los disponibles se listan primero.
 */
export function ConductorSelectItems({
  conductores,
  viajeIdActual,
}: {
  conductores: OpcionConductor[];
  viajeIdActual?: string;
}) {
  const ordenados = [...conductores].sort(
    (a, b) => Number(a.viajeActivo != null) - Number(b.viajeActivo != null),
  );

  return (
    <>
      {ordenados.map((c) => {
        const esEsteViaje =
          c.viajeActivo != null && c.viajeActivo.id === viajeIdActual;
        const ocupado = c.viajeActivo != null && !esEsteViaje;

        return (
          <SelectItem key={c.id} value={c.id} disabled={ocupado}>
            <span className="flex items-center gap-2">
              {c.label}
              {esEsteViaje ? (
                <Badge variant="secondary">Este viaje</Badge>
              ) : c.viajeActivo ? (
                <Badge variant={ESTADO_VIAJE_BADGE[c.viajeActivo.estado]}>
                  {ESTADO_VIAJE_LABEL[c.viajeActivo.estado]} · #
                  {c.viajeActivo.folio}
                </Badge>
              ) : (
                <Badge variant="success">Disponible</Badge>
              )}
            </span>
          </SelectItem>
        );
      })}
    </>
  );
}
