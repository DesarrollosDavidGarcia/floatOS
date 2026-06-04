// Utilidades de fecha en UTC, fuente única para los cálculos de vencimiento.

export function inicioDelDiaUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function finDelDiaUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function sumarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + dias);
  return r;
}

/** Rango [gte, lt) del día calendario UTC desplazado `dias` respecto a hoy. */
export function rangoDiaUTC(dias: number, hoy: Date = new Date()): { gte: Date; lt: Date } {
  const base = inicioDelDiaUTC(hoy);
  const gte = sumarDias(base, dias);
  const lt = sumarDias(base, dias + 1);
  return { gte, lt };
}

/** Días calendario (UTC) entre dos fechas; positivo si `hasta` es posterior. */
export function diasEntre(desde: Date, hasta: Date): number {
  const ms = inicioDelDiaUTC(hasta).getTime() - inicioDelDiaUTC(desde).getTime();
  return Math.round(ms / 86_400_000);
}
