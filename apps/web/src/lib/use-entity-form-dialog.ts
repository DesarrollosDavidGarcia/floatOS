import { useEffect, useState } from 'react';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from './api';
import { toast } from '@/components/ui/sonner';

export interface UseEntityFormDialogOptions<TValues extends FieldValues, TEntity> {
  schema: ZodType<TValues>;
  /** Entidad a editar; null/undefined => modo crear. */
  entity?: TEntity | null;
  /** Apertura controlada (opcional); si se omite, el hook la gestiona. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Valores por defecto del formulario a partir de la entidad (o vacíos). */
  toDefaults: (entity: TEntity | null | undefined) => DefaultValues<TValues>;
  /** Construye el payload que se envía al API. */
  toPayload: (values: TValues) => unknown;
  /** Ruta base: POST a `endpoint`, PATCH a `${endpoint}/${id}`. */
  endpoint: string;
  /** Extrae el id de la entidad (por defecto `entity.id`). */
  getId?: (entity: TEntity) => string;
  /** Claves de query a invalidar tras guardar. */
  invalidateKeys: unknown[][];
  mensajes: { creado: string; actualizado: string };
  /**
   * Paso opcional tras crear/actualizar (con la entidad ya guardada que devuelve
   * el API), antes de invalidar/cerrar. Útil para subir archivos que necesitan
   * el id recién creado (p. ej. la foto de una unidad nueva). Se espera (await);
   * debe gestionar sus propios errores para no abortar el cierre del diálogo.
   */
  afterSave?: (saved: TEntity, values: TValues) => Promise<void> | void;
}

export interface UseEntityFormDialogResult<TValues extends FieldValues> {
  open: boolean;
  setOpen: (open: boolean) => void;
  form: UseFormReturn<TValues>;
  editando: boolean;
  submit: () => void;
  isPending: boolean;
}

/**
 * Encapsula el flujo común de los diálogos de formulario crear/editar:
 * apertura controlada o interna, useForm + reset al abrir, y la mutación
 * POST/PATCH con invalidación, toast y cierre. Cada componente solo aporta
 * el schema, el mapeo entidad↔formulario y el JSX de campos.
 */
export function useEntityFormDialog<TValues extends FieldValues, TEntity>(
  opts: UseEntityFormDialogOptions<TValues, TEntity>,
): UseEntityFormDialogResult<TValues> {
  const {
    schema,
    entity = null,
    toDefaults,
    toPayload,
    endpoint,
    getId,
    invalidateKeys,
    mensajes,
    afterSave,
  } = opts;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = opts.open ?? internalOpen;
  const setOpen = opts.onOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const editando = entity != null;

  const form = useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(entity),
    mode: 'onTouched',
  });

  const { reset } = form;
  useEffect(() => {
    if (open) reset(toDefaults(entity));
    // toDefaults es estable por archivo; reset es estable en RHF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity]);

  const mutation = useMutation({
    mutationFn: async (values: TValues) => {
      const payload = toPayload(values);
      if (entity != null) {
        const id = getId ? getId(entity) : (entity as unknown as { id: string }).id;
        const { data } = await api.patch<TEntity>(`${endpoint}/${id}`, payload);
        return data;
      }
      const { data } = await api.post<TEntity>(endpoint, payload);
      return data;
    },
    onSuccess: async (saved, values) => {
      // Paso posterior opcional (p. ej. subir la foto a la unidad recién creada).
      // Gestiona su propio error; aquí solo se espera a que termine.
      if (afterSave) await afterSave(saved, values);
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success(editando ? mensajes.actualizado : mensajes.creado);
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return { open, setOpen, form, editando, submit, isPending: mutation.isPending };
}
