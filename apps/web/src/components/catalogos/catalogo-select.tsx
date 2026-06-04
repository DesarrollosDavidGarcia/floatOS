'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCatalogo } from '@/lib/catalogos';

/**
 * Dropdown alimentado por un grupo de catálogo (autoadministrable).
 * Muestra los items activos; si `value` apunta a un item inactivo/histórico,
 * lo incluye igual para no perder la selección al editar.
 */
export function CatalogoSelect({
  grupo,
  value,
  onChange,
  placeholder = 'Selecciona…',
  disabled,
}: {
  grupo: string;
  value?: string | null;
  onChange: (codigo: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { data: items } = useCatalogo(grupo);
  const todos = items ?? [];
  const activos = todos.filter((i) => i.activo);
  const opciones =
    value && !activos.some((i) => i.codigo === value)
      ? [...activos, ...todos.filter((i) => i.codigo === value)]
      : activos;

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((item) => (
          <SelectItem key={item.id} value={item.codigo}>
            {item.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
