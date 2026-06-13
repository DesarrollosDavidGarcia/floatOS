'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fechaCorta } from '@/lib/fecha';
import type { ArchivoUnidad, CategoriaArchivoUnidad, Unidad } from './types';

const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_OK = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ACCEPT = TIPOS_OK.join(',');

function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SeccionArchivos({
  unidadId,
  categoria,
  titulo,
  descripcion,
}: {
  unidadId: string;
  categoria: CategoriaArchivoUnidad;
  titulo: string;
  descripcion: string;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryKey = ['unidad-archivos', unidadId, categoria];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<ArchivoUnidad[]>(
        `/unidades/${unidadId}/archivos`,
        { params: { categoria } },
      );
      return data;
    },
  });

  const subir = useMutation({
    mutationFn: async (archivos: File[]) => {
      const fd = new FormData();
      archivos.forEach((a) => fd.append('archivos', a));
      await api.post(`/unidades/${unidadId}/archivos`, fd, {
        params: { categoria },
        // Quitamos el Content-Type por defecto (json) para que axios fije el
        // multipart con su boundary automáticamente.
        headers: { 'Content-Type': undefined },
      });
    },
    onSuccess: (_d, archivos) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(
        archivos.length === 1 ? 'Archivo subido' : `${archivos.length} archivos subidos`,
      );
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (archivoId: string) => {
      await api.delete(`/unidades/${unidadId}/archivos/${archivoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Archivo eliminado');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  async function descargar(archivo: ArchivoUnidad) {
    try {
      const { data } = await api.get<{ url: string }>(
        `/unidades/${unidadId}/archivos/${archivo.id}/url`,
      );
      window.open(data.url, '_blank', 'noopener');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  function onSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (archivos.length === 0) return;
    const invalidoTipo = archivos.find((a) => !TIPOS_OK.includes(a.type));
    if (invalidoTipo) {
      toast.error(`Tipo no permitido: ${invalidoTipo.name}. Solo PDF o imagen.`);
      return;
    }
    const invalidoTamano = archivos.find((a) => a.size > MAX_BYTES);
    if (invalidoTamano) {
      toast.error(`"${invalidoTamano.name}" supera los 10 MB.`);
      return;
    }
    subir.mutate(archivos);
  }

  const archivos = data ?? [];

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{titulo}</h3>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={onSeleccion}
        />
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={subir.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {subir.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
          {subir.isPending ? 'Subiendo…' : 'Subir archivos'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 pt-1">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : isError ? (
        <p className="py-3 text-center text-sm text-destructive">
          No se pudieron cargar los archivos.
        </p>
      ) : archivos.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          Sin archivos. Usa “Subir archivos” para adjuntar (PDF o imagen, máx 10 MB).
        </p>
      ) : (
        <ul className="divide-y">
          {archivos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {formatoTamano(a.tamanoBytes)} · {fechaCorta(a.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descargar"
                onClick={() => descargar(a)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="Eliminar archivo"
                description={`¿Eliminar "${a.nombre}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                onConfirm={() => eliminar.mutateAsync(a.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ArchivosDialog({
  unidad,
  open,
  onOpenChange,
}: {
  unidad: Unidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Archivos{unidad ? ` · ${unidad.placas}` : ''}</DialogTitle>
          <DialogDescription>
            Adjunta la póliza de seguro (puede tener varios archivos) y los
            documentos propios del vehículo.
          </DialogDescription>
        </DialogHeader>

        {unidad ? (
          <div className="space-y-4">
            <SeccionArchivos
              unidadId={unidad.id}
              categoria="POLIZA_SEGURO"
              titulo="Póliza de seguro"
              descripcion="Carátula, endosos y demás documentos de la póliza."
            />
            <SeccionArchivos
              unidadId={unidad.id}
              categoria="GENERAL"
              titulo="Archivos del vehículo"
              descripcion="Factura, fotos, manuales u otros documentos propios."
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
