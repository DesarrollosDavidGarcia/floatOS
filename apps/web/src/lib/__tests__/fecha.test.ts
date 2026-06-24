import { describe, it, expect } from 'vitest';
import {
  fechaCorta,
  fechaHora,
  fechaRango,
  horaCorta,
  fechaLarga,
  isoADate,
  dateAIso,
} from '@/lib/fecha';

/**
 * Tests de los helpers de fecha (lógica pura). El formateo localizado
 * (date-fns/es) se valida de forma robusta vía patrones/round-trip para no
 * depender del idioma exacto del runtime ni del huso horario del runner.
 */

const ISO_VALIDO = '2026-06-15T14:30:00.000Z';

describe('isoADate', () => {
  it('toma los primeros 10 caracteres del ISO (YYYY-MM-DD)', () => {
    expect(isoADate(ISO_VALIDO)).toBe('2026-06-15');
  });

  it('devuelve "" para undefined', () => {
    expect(isoADate(undefined)).toBe('');
  });

  it('devuelve "" para null', () => {
    expect(isoADate(null)).toBe('');
  });

  it('devuelve "" para string vacío', () => {
    expect(isoADate('')).toBe('');
  });

  it('redondea recortando aunque venga con hora', () => {
    expect(isoADate('1999-12-31T23:59:59Z')).toBe('1999-12-31');
  });
});

describe('dateAIso', () => {
  it('convierte "YYYY-MM-DD" a un ISO válido', () => {
    const iso = dateAIso('2026-06-15');
    // Round-trip: el ISO resultante, recortado, vuelve a la fecha de origen.
    // Se interpreta como medianoche local, así que comparar la parte de fecha
    // sería frágil por husos; validamos que sea un ISO parseable y consistente.
    expect(() => new Date(iso).toISOString()).not.toThrow();
    expect(new Date(iso).toISOString()).toBe(iso);
  });

  it('produce un string en formato ISO 8601', () => {
    const iso = dateAIso('2026-01-01');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('representa la medianoche local de la fecha dada', () => {
    const iso = dateAIso('2026-06-15');
    const d = new Date(iso);
    // La fecha local (no UTC) debe coincidir con la entrada.
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // junio = 5 (0-indexado)
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('fechaCorta', () => {
  it('devuelve "—" para valores vacíos/nulos', () => {
    expect(fechaCorta(null)).toBe('—');
    expect(fechaCorta(undefined)).toBe('—');
    expect(fechaCorta('')).toBe('—');
  });

  it('devuelve "—" para un ISO inválido', () => {
    expect(fechaCorta('no-es-fecha')).toBe('—');
  });

  it('formatea un ISO válido como "dd MMM yyyy"', () => {
    // No fijamos el mes localizado (depende del locale), pero sí el patrón:
    // dos dígitos de día, un mes alfabético y el año.
    expect(fechaCorta(ISO_VALIDO)).toMatch(/^\d{2} \S+ 2026$/);
  });
});

describe('fechaHora', () => {
  it('devuelve "—" para entrada inválida', () => {
    expect(fechaHora('')).toBe('—');
    expect(fechaHora('xyz')).toBe('—');
  });

  it('incluye día, año y hora HH:mm', () => {
    expect(fechaHora(ISO_VALIDO)).toMatch(/^\d{2} \S+ 2026, \d{2}:\d{2}$/);
  });
});

describe('fechaLarga', () => {
  it('devuelve "—" para entrada inválida', () => {
    expect(fechaLarga(null)).toBe('—');
  });

  it('formatea con "de" y hora para un ISO válido', () => {
    expect(fechaLarga(ISO_VALIDO)).toMatch(/^\d{1,2} de \S+ 2026, \d{2}:\d{2}$/);
  });
});

describe('horaCorta', () => {
  it('devuelve "" (cadena vacía) para entrada inválida', () => {
    expect(horaCorta(null)).toBe('');
    expect(horaCorta(undefined)).toBe('');
    expect(horaCorta('')).toBe('');
    expect(horaCorta('no-fecha')).toBe('');
  });

  it('devuelve solo la hora HH:mm para un ISO válido', () => {
    expect(horaCorta(ISO_VALIDO)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('fechaRango', () => {
  it('devuelve "—" cuando el inicio es inválido', () => {
    expect(fechaRango(null, ISO_VALIDO)).toBe('—');
    expect(fechaRango('', ISO_VALIDO)).toBe('—');
    expect(fechaRango('no-fecha', ISO_VALIDO)).toBe('—');
  });

  it('devuelve solo el inicio cuando no hay fin', () => {
    expect(fechaRango(ISO_VALIDO, null)).toBe(fechaCorta(ISO_VALIDO));
    expect(fechaRango(ISO_VALIDO)).toBe(fechaCorta(ISO_VALIDO));
  });

  it('devuelve "inicio – fin" cuando ambos son válidos', () => {
    const fin = '2026-06-22T00:00:00.000Z';
    expect(fechaRango(ISO_VALIDO, fin)).toBe(
      `${fechaCorta(ISO_VALIDO)} – ${fechaCorta(fin)}`,
    );
  });
});
