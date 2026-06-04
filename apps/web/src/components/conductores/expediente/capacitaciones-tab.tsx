'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  ExpedienteFormDialog,
  CamposGrid,
  Campo,
} from '@/components/conductores/expediente/form-ui';

interface CapacitacionConductor {
  id: string;
  conductorId: string;
  nombre: string;
  instructor?: string | null;
  institucion?: string | null;
  horas?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  aprobado?: boolean | null;
  calificacion?: number | null;
  constanciaKey?: string | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CapacitacionFormPayload {
  nombre: string;
  instructor?: string;
  institucion?: string;
  horas?: number;
  fechaInicio?: string;
  fechaFin?: string;
  aprobado?: boolean;
  calificacion?: number;
  constanciaKey?: string;
  notas?: string;
}

function isoADate(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function CapacitacionForm({
  conductorId,
  capacitacion,
  open,
  onOpenChange,
  onDone,
}: {
  conductorId: string;
  capacitacion?: CapacitacionConductor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const esEdicion = Boolean(capacitacion);
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState(capacitacion?.nombre ?? '');
  const [instructor, setInstructor] = useState(capacitacion?.instructor ?? '');
  const [institucion, setInstitucion] = useState(capacitacion?.institucion ?? '');
  const [horas, setHoras] = useState(capacitacion?.horas?.toString() ?? '');
  const [fechaInicio, setFechaInicio] = useState(isoADate(capacitacion?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(isoADate(capacitacion?.fechaFin));
  const [aprobado, setAprobado] = useState<string>(
    capacitacion?.aprobado === true
      ? 'true'
      : capacitacion?.aprobado === false
        ? 'false'
        : '',
  );
  const [calificacion, setCalificacion] = useState(
    capacitacion?.calificacion?.toString() ?? '',
  );
  const [constanciaKey, setConstanciaKey] = useState(capacitacion?.constanciaKey ?? '');
  const [notas, setNotas] = useState(capacitacion?.notas ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setNombre(capacitacion?.nombre ?? '');
    setInstructor(capacitacion?.instructor ?? '');
    setInstitucion(capacitacion?.institucion ?? '');
    setHoras(capacitacion?.horas?.toString() ?? '');
    setFechaInicio(isoADate(capacitacion?.fechaInicio));
    setFechaFin(isoADate(capacitacion?.fechaFin));
    setAprobado(
      capacitacion?.aprobado === true
        ? 'true'
        : capacitacion?.aprobado === false
          ? 'false'
          : '',
    );
    setCalificacion(capacitacion?.calificacion?.toString() ?? '');
    setConstanciaKey(capacitacion?.constanciaKey ?? '');
    setNotas(capacitacion?.notas ?? '');
    setError('');
  }, [capacitacion]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!nombre.trim()) {
        throw new Error('El nombre es obligatorio');
      }

      const payload: CapacitacionFormPayload = { nombre: nombre.trim() };
      if (instructor.trim()) payload.instructor = instructor.trim();
      if (institucion.trim()) payload.institucion = institucion.trim();
      if (horas !== '') payload.horas = Number(horas);
      if (fechaInicio) payload.fechaInicio = new Date(fechaInicio).toISOString();
      if (fechaFin) payload.fechaFin = new Date(fechaFin).toISOString();
      if (aprobado !== '') payload.aprobado = aprobado === 'true';
      if (calificacion !== '') payload.calificacion = Number(calificacion);
      if (constanciaKey.trim()) payload.constanciaKey = constanciaKey.trim();
      if (notas.trim()) payload.notas = notas.trim();

      if (esEdicion && capacitacion) {
        await api.patch(
          `/conductores/${conductorId}/capacitaciones/${capacitacion.id}`,
          payload,
        );
      } else {
        await api.post(`/conductores/${conductorId}/capacitaciones`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-capacitaciones', conductorId],
      });
      toast.success(esEdicion ? 'Capacitación actualizada' : 'Capacitación agregada');
      onDone();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : apiError(err);
      setError(msg);
      toast.error(msg);
    },
  });

  return (
    <ExpedienteFormDialog
      open={open}
      onOpenChange={(o) => { if (!o) onDone(); onOpenChange(o); }}
      title={esEdicion ? 'Editar capacitación' : 'Nueva capacitación'}
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        mutation.mutate();
      }}
      saving={mutation.isPending}
      submitLabel={esEdicion ? 'Guardar' : 'Agregar'}
      size="md"
    >
      <CamposGrid cols={2}>
        <Campo label="Nombre *" htmlFor="cap-nombre" full>
          <Input
            id="cap-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del curso"
          />
        </Campo>

        <Campo label="Instructor" htmlFor="cap-instructor">
          <Input
            id="cap-instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
          />
        </Campo>

        <Campo label="Institución" htmlFor="cap-institucion">
          <Input
            id="cap-institucion"
            value={institucion}
            onChange={(e) => setInstitucion(e.target.value)}
          />
        </Campo>

        <Campo label="Horas" htmlFor="cap-horas">
          <Input
            id="cap-horas"
            type="number"
            min={0}
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
          />
        </Campo>

        <Campo label="Calificación" htmlFor="cap-calificacion">
          <Input
            id="cap-calificacion"
            type="number"
            step="0.01"
            min={0}
            value={calificacion}
            onChange={(e) => setCalificacion(e.target.value)}
          />
        </Campo>

        <Campo label="Fecha inicio" htmlFor="cap-fechaInicio">
          <Input
            id="cap-fechaInicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </Campo>

        <Campo label="Fecha fin" htmlFor="cap-fechaFin">
          <Input
            id="cap-fechaFin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </Campo>

        <Campo label="Aprobado">
          <Select value={aprobado} onValueChange={setAprobado}>
            <SelectTrigger>
              <SelectValue placeholder="Sin definir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Clave constancia" htmlFor="cap-constanciaKey">
          <Input
            id="cap-constanciaKey"
            value={constanciaKey}
            onChange={(e) => setConstanciaKey(e.target.value)}
          />
        </Campo>

        <Campo label="Notas" htmlFor="cap-notas" full>
          <textarea
            id="cap-notas"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </Campo>
      </CamposGrid>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </ExpedienteFormDialog>
  );
}

export function CapacitacionesTab({ conductorId }: { conductorId: string }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<CapacitacionConductor | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conductor-capacitaciones', conductorId],
    queryFn: async () => {
      const { data } = await api.get<CapacitacionConductor[]>(
        `/conductores/${conductorId}/capacitaciones`,
      );
      return data;
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/conductores/${conductorId}/capacitaciones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conductor-capacitaciones', conductorId],
      });
      toast.success('Capacitación eliminada');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setMostrarForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Agregar capacitación
        </Button>
      </div>

      <CapacitacionForm
        conductorId={conductorId}
        capacitacion={editando ?? undefined}
        open={mostrarForm || Boolean(editando)}
        onOpenChange={(o) => { if (!o) cerrarForm(); }}
        onDone={cerrarForm}
      />

      <div className="overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            No se pudieron cargar las capacitaciones.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin capacitaciones registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead>Aprobado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cap) => (
                <TableRow key={cap.id}>
                  <TableCell>
                    <div className="font-medium">{cap.nombre}</div>
                    {cap.instructor && (
                      <div className="text-xs text-muted-foreground">{cap.instructor}</div>
                    )}
                  </TableCell>
                  <TableCell>{cap.institucion ?? '—'}</TableCell>
                  <TableCell>{cap.horas != null ? cap.horas : '—'}</TableCell>
                  <TableCell>{cap.calificacion != null ? Number(cap.calificacion) : '—'}</TableCell>
                  <TableCell>
                    {cap.aprobado === true ? (
                      <Badge variant="default">Sí</Badge>
                    ) : cap.aprobado === false ? (
                      <Badge variant="destructive">No</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(cap);
                          setMostrarForm(false);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Eliminar capacitación"
                        description="Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        onConfirm={() => eliminar.mutateAsync(cap.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
