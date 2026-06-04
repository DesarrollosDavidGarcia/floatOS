'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Grid compacto para los formularios del expediente (2 o 3 columnas). */
export function CamposGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-3 gap-y-2.5',
        cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
      )}
    >
      {children}
    </div>
  );
}

/** Campo compacto: etiqueta pequeña + control + error. `full` ocupa toda la fila. */
export function Campo({
  label,
  htmlFor,
  error,
  full,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1', full && 'sm:col-span-full')}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Modal compacto reutilizable para agregar/editar un registro del expediente.
 * Envuelve los campos (que van dentro de <CamposGrid>) y aporta el footer.
 */
export function ExpedienteFormDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  saving,
  submitLabel = 'Guardar',
  size = 'md',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  saving?: boolean;
  submitLabel?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={size === 'lg' ? 'max-w-2xl' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Guardando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Barra superior de una sección: título opcional + acción a la derecha. */
export function SeccionHeader({
  titulo,
  children,
}: {
  titulo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-muted-foreground">{titulo}</h3>
      {children}
    </div>
  );
}
