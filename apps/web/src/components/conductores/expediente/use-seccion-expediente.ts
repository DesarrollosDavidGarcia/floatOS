'use client';

import { useEffect, useState } from 'react';
import {
  useForm,
  type DefaultValues,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodTypeAny } from 'zod';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

/**
 * Hook común para las secciones del expediente del conductor (certificaciones,
 * capacitaciones, evaluaciones, etc.). Encapsula lo que TODAS comparten:
 *
 *  - `useQuery(['conductor-<seccion>', conductorId])` para listar.
 *  - mutación de guardado (POST al crear / PATCH al editar) + invalidación.
 *  - mutación de borrado + invalidación.
 *  - estado del formulario (crear/editar/cerrar) y el `reset` sincronizado.
 *
 * Cada tab sigue definiendo SU schema, SUS columnas y SUS campos de formulario;
 * el hook solo elimina el boilerplate repetido. Las query keys, endpoints,
 * toasts e invalidación se mantienen idénticos a los originales.
 */
export interface UseSeccionExpedienteOptions<TItem, TForm extends Record<string, unknown>> {
  conductorId: string;
  /** Sufijo de la query key: ['conductor-<queryKey>', conductorId]. */
  queryKey: string;
  /** Base del endpoint REST, p.ej. 'certificaciones' → /conductores/:id/certificaciones[/:itemId]. */
  endpoint: string;
  schema: ZodTypeAny;
  /** Valores por defecto del form (creación) y mapeo desde un item (edición). */
  toDefaults: (item?: TItem) => TForm;
  /** Construye el payload que se envía a la API a partir de los valores del form. */
  toPayload: (values: TForm) => Record<string, unknown>;
  /** Mensajes de los toasts de éxito. */
  mensajes: {
    creado: string;
    actualizado: string;
    eliminado: string;
  };
  /** Pasa `enabled` al useQuery (algunas tabs usan Boolean(conductorId)). */
  enabled?: boolean;
}

export interface UseSeccionExpedienteResult<TItem, TForm extends Record<string, unknown>> {
  /** Resultado crudo del listado (por si la tab necesita algo extra). */
  query: UseQueryResult<TItem[]>;
  items: TItem[] | undefined;
  isLoading: boolean;
  isError: boolean;

  form: UseFormReturn<TForm>;
  esEdicion: boolean;
  /** Registro en edición (o null si se está creando / cerrado). */
  editando: TItem | null;
  /** El diálogo está abierto (crear o editar). */
  abierto: boolean;

  abrirCrear: () => void;
  abrirEditar: (item: TItem) => void;
  cerrarForm: () => void;

  /** handleSubmit ya cableado a la mutación de guardado. */
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  guardando: boolean;

  eliminar: (id: string) => Promise<void>;
  eliminando: boolean;
}

export function useSeccionExpediente<TItem extends { id: string }, TForm extends Record<string, unknown>>(
  opts: UseSeccionExpedienteOptions<TItem, TForm>,
): UseSeccionExpedienteResult<TItem, TForm> {
  const {
    conductorId,
    queryKey,
    endpoint,
    schema,
    toDefaults,
    toPayload,
    mensajes,
    enabled,
  } = opts;

  const queryClient = useQueryClient();
  const listKey = [`conductor-${queryKey}`, conductorId] as const;

  const [editando, setEditando] = useState<TItem | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const esEdicion = Boolean(editando);
  const abierto = mostrarForm || Boolean(editando);

  const query = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const { data } = await api.get<TItem[]>(`/conductores/${conductorId}/${endpoint}`);
      return data;
    },
    ...(enabled !== undefined ? { enabled } : {}),
  });

  const form = useForm<TForm>({
    resolver: zodResolver(schema) as Resolver<TForm>,
    mode: 'onTouched',
    defaultValues: toDefaults() as DefaultValues<TForm>,
  });

  // Sincroniza el form cuando cambia el registro en edición o se abre/cierra
  // el diálogo (mismo comportamiento que el patrón inline original).
  useEffect(() => {
    form.reset(toDefaults(editando ?? undefined) as DefaultValues<TForm>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, mostrarForm, form.reset]);

  function abrirCrear() {
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(item: TItem) {
    setMostrarForm(false);
    setEditando(item);
  }

  function cerrarForm() {
    setEditando(null);
    setMostrarForm(false);
  }

  const guardar = useMutation({
    mutationFn: async (values: TForm) => {
      const payload = toPayload(values);
      if (esEdicion && editando) {
        await api.patch(`/conductores/${conductorId}/${endpoint}/${editando.id}`, payload);
      } else {
        await api.post(`/conductores/${conductorId}/${endpoint}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(esEdicion ? mensajes.actualizado : mensajes.creado);
      cerrarForm();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/conductores/${conductorId}/${endpoint}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(mensajes.eliminado);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return {
    query,
    items: query.data,
    isLoading: query.isLoading,
    isError: query.isError,

    form,
    esEdicion,
    editando,
    abierto,

    abrirCrear,
    abrirEditar,
    cerrarForm,

    onSubmit: form.handleSubmit((values) => guardar.mutate(values)),
    guardando: guardar.isPending,

    eliminar: (id: string) => eliminarMutation.mutateAsync(id),
    eliminando: eliminarMutation.isPending,
  };
}
