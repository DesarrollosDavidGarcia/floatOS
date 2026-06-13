'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { Input } from './input';

interface NumberFieldProps
  extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Input numérico controlado robusto: mantiene su propio texto mientras está
 * enfocado (permite vaciarlo y teclear decimales sin el "0" pegado al inicio) y
 * se sincroniza con el valor numérico al desenfocar/precargar. Un valor 0 se
 * muestra vacío (placeholder "0"), así no aparece "05334" al editar.
 */
export function NumberField({
  value,
  onChange,
  placeholder = '0',
  ...props
}: NumberFieldProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value ? String(value) : '');
  }, [value, focused]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;
        // Solo permite número/decimal (o vacío).
        if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        const n = raw === '' || raw === '.' ? 0 : Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}
