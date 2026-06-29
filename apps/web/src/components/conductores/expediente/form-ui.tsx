'use client';

import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/**
 * Campo compacto: etiqueta pequeña + control + error. `full` ocupa toda la
 * fila. `required` muestra un asterisco. Cuando hay `error`, resalta en rojo
 * la etiqueta, el borde del control (input/textarea/select) y muestra el motivo.
 */
export function Campo({
  label,
  htmlFor,
  error,
  required,
  full,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  // Inyecta atributos ARIA en el control para que la validación se anuncie:
  // aria-invalid cuando hay error, aria-describedby apuntando al texto de error,
  // y aria-required cuando el campo es obligatorio.
  const control =
    isValidElement(children) && (error || required)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          'aria-invalid': error ? true : undefined,
          'aria-describedby':
            [
              (children as ReactElement<Record<string, unknown>>).props[
                'aria-describedby'
              ],
              errorId,
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          'aria-required': required ? true : undefined,
        })
      : children;

  return (
    <div className={cn('space-y-1', full && 'sm:col-span-full')}>
      <Label
        htmlFor={htmlFor}
        className={cn(
          'text-xs font-medium',
          error ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      <div
        className={cn(
          error &&
            '[&_input]:border-destructive [&_input]:focus-visible:ring-destructive [&_textarea]:border-destructive [&_[role=combobox]]:border-destructive',
        )}
      >
        {control}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-xs text-destructive"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
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
  description = 'Completa los campos y guarda los cambios.',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  saving?: boolean;
  submitLabel?: string;
  size?: 'md' | 'lg' | 'xl';
  description?: string;
  children: ReactNode;
}) {
  const anchoMax =
    size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={anchoMax}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
