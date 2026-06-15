'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, UserCog } from 'lucide-react';
import { MOTIVOS_REASIGNACION } from '@flotaos/shared-types';
import type { EstadoViaje } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { invalidarViajes } from '@/lib/query-keys';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConductoresCatalogo, useUnidadesCatalogo } from './catalogos';
import { ConductorSelectItems } from './conductor-select-items';

const NINGUNO = '__ninguno__';

/** Estados "en curso": reasignar aquí afecta una operación en marcha → se advierte. */
const ESTADOS_EN_CURSO: EstadoViaje[] = [
  'EN_CAMINO_ORIGEN',
  'CARGANDO',
  'EN_TRANSITO',
] as EstadoViaje[];

const MOTIVO_LABEL: Record<string, string> = {
  AVERIA: 'Avería',
  ACCIDENTE: 'Accidente',
  RELEVO: 'Relevo de conductor',
  INCIDENCIA: 'Incidencia',
  OTRO: 'Otro',
};

export function AsignarDialog({
  viajeId,
  estado,
  unidadIdActual,
  conductorIdActual,
}: {
  viajeId: string;
  estado?: EstadoViaje;
  unidadIdActual?: string | null;
  conductorIdActual?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [unidadId, setUnidadId] = useState<string>(unidadIdActual ?? NINGUNO);
  const [conductorId, setConductorId] = useState<string>(conductorIdActual ?? NINGUNO);
  const [motivo, setMotivo] = useState<string>(NINGUNO);
  const [nota, setNota] = useState<string>('');
  const qc = useQueryClient();

  const unidades = useUnidadesCatalogo();
  const conductores = useConductoresCatalogo();

  useEffect(() => {
    if (open) {
      setUnidadId(unidadIdActual ?? NINGUNO);
      setConductorId(conductorIdActual ?? NINGUNO);
      setMotivo(NINGUNO);
      setNota('');
    }
  }, [open, unidadIdActual, conductorIdActual]);

  const mutar = useMutation({
    mutationFn: async () => {
      const body: {
        unidadId?: string | null;
        conductorId?: string | null;
        motivo?: string;
        nota?: string;
      } = {
        unidadId: unidadId === NINGUNO ? null : unidadId,
        conductorId: conductorId === NINGUNO ? null : conductorId,
        motivo: motivo === NINGUNO ? undefined : motivo,
        nota: nota.trim() || undefined,
      };
      const { data } = await api.patch(`/viajes/${viajeId}/asignar`, body);
      return data;
    },
    onSuccess: () => {
      toast.success('Asignación actualizada');
      invalidarViajes(qc, viajeId);
      // La disponibilidad de los conductores cambió (chips del selector).
      void qc.invalidateQueries({ queryKey: ['catalogo', 'conductores'] });
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const tieneAsignacion = Boolean(unidadIdActual || conductorIdActual);
  const enCurso = estado ? ESTADOS_EN_CURSO.includes(estado) : false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCog />
          {tieneAsignacion ? 'Reasignar' : 'Asignar'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar unidad y conductor</DialogTitle>
          <DialogDescription>Selecciona la unidad y/o el conductor del viaje.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {enCurso && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Este viaje está <strong>en curso</strong>. Reasignar afecta una
                operación en marcha; indica el motivo para dejar constancia.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="asignar-unidad">Unidad</Label>
            <Select value={unidadId} onValueChange={setUnidadId}>
              <SelectTrigger id="asignar-unidad">
                <SelectValue placeholder={unidades.isLoading ? 'Cargando…' : 'Sin asignar'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                {(unidades.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asignar-conductor">Conductor</Label>
            <Select value={conductorId} onValueChange={setConductorId}>
              <SelectTrigger id="asignar-conductor">
                <SelectValue placeholder={conductores.isLoading ? 'Cargando…' : 'Sin asignar'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NINGUNO}>Sin asignar</SelectItem>
                <ConductorSelectItems
                  conductores={conductores.data ?? []}
                  viajeIdActual={viajeId}
                />
              </SelectContent>
            </Select>
          </div>

          {tieneAsignacion && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="asignar-motivo">Motivo de la reasignación</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger id="asignar-motivo">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NINGUNO}>Sin especificar</SelectItem>
                    {MOTIVOS_REASIGNACION.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MOTIVO_LABEL[m] ?? m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asignar-nota">Nota</Label>
                <Textarea
                  id="asignar-nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Detalle de lo ocurrido (opcional)"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutar.mutate()} disabled={mutar.isPending}>
            {mutar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
