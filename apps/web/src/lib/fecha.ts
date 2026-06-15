import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Parsea un ISO a Date válido, o null. */
function aDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fecha corta única del panel: "15 ene 2026" (o "—"). */
export function fechaCorta(iso?: string | null): string {
  const d = aDate(iso);
  return d ? format(d, 'dd MMM yyyy', { locale: es }) : '—';
}

/** Fecha con hora compacta: "15 ene 2026, 14:30" (o "—"). */
export function fechaHora(iso?: string | null): string {
  const d = aDate(iso);
  return d ? format(d, 'dd MMM yyyy, HH:mm', { locale: es }) : '—';
}

/** Rango de fechas cortas: "15 ene – 22 ene 2026" (o solo inicio, o "—"). */
export function fechaRango(inicio?: string | null, fin?: string | null): string {
  if (!aDate(inicio)) return '—';
  return fin ? `${fechaCorta(inicio)} – ${fechaCorta(fin)}` : fechaCorta(inicio);
}

/** Solo la hora: "14:30" (o "" si la fecha no es válida). */
export function horaCorta(iso?: string | null): string {
  const d = aDate(iso);
  return d ? format(d, 'HH:mm', { locale: es }) : '';
}

/** Fecha larga con hora: "15 de junio 2026, 14:30" (o "—"). */
export function fechaLarga(iso?: string | null): string {
  const d = aDate(iso);
  return d ? format(d, "d 'de' MMMM yyyy, HH:mm", { locale: es }) : '—';
}
