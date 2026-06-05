'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { vencimientoInfo } from '@/lib/vencimiento';
import { fechaCorta, fechaRango } from '@/lib/fecha';

/** Fecha corta en español ("15 ene 2026") o "—". */
export function Fecha({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  return <>{fechaCorta(iso)}</>;
}

/** Rango de fechas "15 ene – 22 ene 2026" (o solo inicio si no hay fin). */
export function RangoFechas({
  inicio,
  fin,
}: {
  inicio?: string | null;
  fin?: string | null;
}) {
  if (!inicio) return <span className="text-muted-foreground">—</span>;
  return <>{fechaRango(inicio, fin)}</>;
}

/** Monto en pesos ("$1,234.00") o "—". */
export function Dinero({ value }: { value?: number | string | null }) {
  if (value === null || value === undefined || value === '')
    return <span className="text-muted-foreground">—</span>;
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return <span className="text-muted-foreground">—</span>;
  return (
    <>{n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</>
  );
}

/**
 * Estado de vigencia a partir de una fecha de vencimiento: badge de color
 * (Vigente / Por vencer N d / Vencido N d) + la fecha en gris debajo.
 * Si no hay fecha, muestra "—".
 */
export function Vigencia({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const venc = new Date(iso);
  if (Number.isNaN(venc.getTime()))
    return <span className="text-muted-foreground">—</span>;

  const { estado, variant, label } = vencimientoInfo(iso);

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge variant={variant}>{estado === 'vigente' ? 'Vigente' : label}</Badge>
      <span className="text-xs text-muted-foreground">{fechaCorta(iso)}</span>
    </div>
  );
}

/** Celda principal: valor en negrita + subtexto en gris (contexto secundario). */
export function CeldaPrincipal({
  titulo,
  subtitulo,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
}) {
  const tieneSub =
    subtitulo !== null &&
    subtitulo !== undefined &&
    subtitulo !== '' &&
    !(Array.isArray(subtitulo) && subtitulo.length === 0);
  return (
    <div className="flex flex-col">
      <span className="font-medium">{titulo}</span>
      {tieneSub && (
        <span className="text-xs text-muted-foreground">{subtitulo}</span>
      )}
    </div>
  );
}

/** Une partes no vacías con " · " (para subtítulos: "Clínica SCT · Dr. Pérez"). */
export function unirSub(...partes: Array<string | null | undefined>): string {
  return partes
    .map((p) => (p ?? '').toString().trim())
    .filter((p) => p.length > 0)
    .join(' · ');
}

/** Conteo de registros ("3 registros"). */
export function Conteo({ n }: { n: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      {n} {n === 1 ? 'registro' : 'registros'}
    </p>
  );
}
