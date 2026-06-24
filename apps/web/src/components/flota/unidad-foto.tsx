'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2, Truck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { Unidad } from './types';

const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT = TIPOS_OK.join(',');

/** Valida tipo y tamaño; avisa con toast y devuelve si el archivo sirve. */
function fotoValida(archivo: File): boolean {
  if (!TIPOS_OK.includes(archivo.type)) {
    toast.error('Formato no permitido. Usa JPG, PNG o WEBP.');
    return false;
  }
  if (archivo.size > MAX_BYTES) {
    toast.error('La foto supera los 10 MB.');
    return false;
  }
  return true;
}

/**
 * Miniatura de la foto de referencia de una unidad (para la tabla de flota).
 * Si no tiene foto, muestra un ícono de camión como placeholder.
 */
export function UnidadFotoMini({
  fotoUrl,
  placas,
  className,
}: {
  fotoUrl?: string | null;
  placas: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted',
        className,
      )}
    >
      {fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de MinIO
        <img
          src={fotoUrl}
          alt={`Foto de la unidad ${placas}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <Truck className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

/** Recuadro grande con la foto (o placeholder) — comparte estilo entre modos. */
function FotoPreview({ src, placas }: { src: string | null; placas: string }) {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada / object URL local
        <img
          src={src}
          alt={`Foto de la unidad ${placas}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <Truck className="h-7 w-7 text-muted-foreground" />
      )}
    </div>
  );
}

const PIE =
  'JPG, PNG o WEBP · máx 10 MB. Sirve como referencia visual del vehículo.';

/**
 * Subida/gestión de la foto de referencia de una unidad.
 *
 * - **Editar** (`unidad` presente): sube de inmediato al elegir el archivo e
 *   invalida el listado para refrescar la miniatura de la tabla.
 * - **Crear** (`onPick` presente, sin `unidad`): modo *diferido* — solo elige
 *   la foto y muestra un preview local; el padre la sube tras crear la unidad.
 */
export function UnidadFotoUploader(props: {
  unidad?: Unidad;
  /** Modo crear: foto elegida pendiente de subir. */
  pendingFile?: File | null;
  /** Modo crear: reporta el archivo elegido (o null al quitar). */
  onPick?: (file: File | null) => void;
  placas?: string;
}) {
  if (props.unidad) {
    return <UploaderInmediato unidad={props.unidad} />;
  }
  return (
    <UploaderDiferido
      pendingFile={props.pendingFile ?? null}
      onPick={props.onPick ?? (() => {})}
      placas={props.placas ?? 'nueva'}
    />
  );
}

/** Modo editar: sube/borra contra el API al instante. */
function UploaderInmediato({ unidad }: { unidad: Unidad }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(unidad.fotoUrl ?? null);

  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      const fd = new FormData();
      fd.append('foto', archivo);
      const { data } = await api.post<Unidad>(`/unidades/${unidad.id}/foto`, fd, {
        headers: { 'Content-Type': undefined },
      });
      return data;
    },
    onSuccess: (data) => {
      setFotoUrl(data.fotoUrl ?? null);
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Foto actualizada');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const quitar = useMutation({
    mutationFn: async () => {
      await api.delete(`/unidades/${unidad.id}/foto`);
    },
    onSuccess: () => {
      setFotoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Foto eliminada');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !fotoValida(archivo)) return;
    subir.mutate(archivo);
  }

  const ocupado = subir.isPending || quitar.isPending;

  return (
    <div className="flex items-center gap-4">
      <FotoPreview src={fotoUrl} placas={unidad.placas} />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onSeleccion}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={ocupado}
            onClick={() => inputRef.current?.click()}
          >
            {subir.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {fotoUrl ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {fotoUrl && (
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm" variant="ghost" disabled={ocupado}>
                  <Trash2 className="text-destructive" /> Quitar
                </Button>
              }
              title="Quitar foto"
              description="¿Eliminar la foto de referencia de esta unidad?"
              confirmLabel="Quitar"
              onConfirm={() => quitar.mutateAsync()}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{PIE}</p>
      </div>
    </div>
  );
}

/** Modo crear: solo elige la foto (preview local); la sube el padre al guardar. */
function UploaderDiferido({
  pendingFile,
  onPick,
  placas,
}: {
  pendingFile: File | null;
  onPick: (file: File | null) => void;
  placas: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Genera (y libera) el object URL del preview local cuando cambia el archivo.
  useEffect(() => {
    if (!pendingFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  function onSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !fotoValida(archivo)) return;
    onPick(archivo);
  }

  return (
    <div className="flex items-center gap-4">
      <FotoPreview src={preview} placas={placas} />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onSeleccion}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus />
            {pendingFile ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {pendingFile && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onPick(null)}
            >
              <Trash2 className="text-destructive" /> Quitar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {pendingFile
            ? 'Se subirá al crear la unidad. ' + PIE
            : PIE}
        </p>
      </div>
    </div>
  );
}
