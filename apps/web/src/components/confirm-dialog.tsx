'use client';

import { type ReactNode, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  trigger,
  open: openProp,
  onOpenChange,
  title = '¿Confirmar?',
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
}: {
  /** Modo no controlado: el diálogo se abre al hacer click en este elemento. */
  trigger?: ReactNode;
  /** Modo controlado: el padre gobierna la apertura (p. ej. desde un menú). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [openInner, setOpenInner] = useState(false);
  const controlado = openProp !== undefined;
  const open = controlado ? openProp : openInner;
  const setOpen = (v: boolean) => {
    if (!controlado) setOpenInner(v);
    onOpenChange?.(v);
  };
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <span onClick={() => setOpen(true)}>{trigger}</span> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handle} disabled={loading}>
            {loading ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
