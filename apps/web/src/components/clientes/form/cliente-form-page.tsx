'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Campo, CamposGrid } from '@/components/conductores/expediente/form-ui';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';
import { SucursalesClienteSection } from '@/components/clientes/sucursales-section';
import type { Cliente } from '@/app/(panel)/clientes/tipos';
import {
  CONTACTO_VACIO,
  clienteFormSchema,
  defaultsCrear,
  defaultsDeCliente,
  toPayload,
  type ClienteFormValues,
} from './form-types';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function ClienteFormPage({
  mode,
  cliente,
}: {
  mode: 'crear' | 'editar';
  cliente?: Cliente;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    mode: 'onTouched',
    defaultValues:
      mode === 'editar' && cliente ? defaultsDeCliente(cliente) : defaultsCrear(),
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: 'contactos' });

  /** Marca un contacto como principal y desmarca el resto. */
  function marcarPrincipal(idx: number) {
    getValues('contactos').forEach((_, i) =>
      setValue(`contactos.${i}.esPrincipal`, i === idx, { shouldDirty: true }),
    );
  }

  const guardar = useMutation({
    mutationFn: async (values: ClienteFormValues) => {
      const payload = toPayload(values);
      if (mode === 'crear') {
        const { data } = await api.post<Cliente>('/clientes', payload);
        return data;
      }
      const { data } = await api.patch<Cliente>(`/clientes/${cliente!.id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success(mode === 'crear' ? 'Cliente creado' : 'Cliente actualizado');
      qc.invalidateQueries({ queryKey: ['clientes'] });
      router.push('/clientes');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  // ── Autollenar con Constancia de Situación Fiscal (IA) — solo al crear ──
  const archivoCsfRef = useRef<HTMLInputElement>(null);

  const extraerCsf = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('archivo', file);
      const { data } = await api.post<{
        razonSocial: string | null;
        rfc: string | null;
        regimenFiscal: string | null;
        regimenFiscalNombre: string | null;
        cpFiscal: string | null;
        direccion: string | null;
        confianza: 'alta' | 'media' | 'baja';
        advertencias: string[];
      }>('/ai/clientes/csf', fd, { headers: { 'Content-Type': undefined } });
      return data;
    },
    onSuccess: (d) => {
      let aplico = false;
      if (d.razonSocial) {
        setValue('razonSocial', d.razonSocial, { shouldValidate: true });
        aplico = true;
      }
      if (d.rfc) {
        setValue('rfc', d.rfc, { shouldValidate: true });
        aplico = true;
      }
      if (d.cpFiscal) {
        setValue('cpFiscal', d.cpFiscal, { shouldValidate: true });
        aplico = true;
      }
      if (d.direccion) {
        setValue('direccion', d.direccion, { shouldValidate: true });
        aplico = true;
      }
      if (d.regimenFiscal) {
        setValue('regimenFiscal', d.regimenFiscal, { shouldValidate: true });
        aplico = true;
      }
      if (aplico) {
        toast.success(
          `Datos extraídos (confianza ${d.confianza}). Revísalos antes de guardar.`,
        );
      } else {
        toast.info('No se pudieron leer datos de la constancia. Captura a mano.');
      }
      if (d.advertencias?.length) toast.warning(d.advertencias.join(' · '));
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function onArchivoCsf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo
    if (file) extraerCsf.mutate(file);
  }

  /**
   * Atajo CFDI 4.0: configura el cliente como "Público en general".
   * RFC genérico XAXX010101000 (nacional) / XEXX010101000 (extranjero), con
   * régimen 616 (Sin obligaciones fiscales) y uso S01 (Sin efectos fiscales).
   */
  function aplicarPublicoGeneral(internacional: boolean) {
    setValue('razonSocial', 'PÚBLICO EN GENERAL', { shouldValidate: true });
    setValue('rfc', internacional ? 'XEXX010101000' : 'XAXX010101000', {
      shouldValidate: true,
    });
    setValue('regimenFiscal', '616', { shouldValidate: true });
    setValue('usoCfdi', 'S01', { shouldValidate: true });
    toast.success(
      `Configurado como Público en general${internacional ? ' (internacional)' : ''}. Revisa los datos.`,
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => guardar.mutate(v))} className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Volver">
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {mode === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}
          </h1>
        </div>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending
            ? 'Guardando…'
            : mode === 'crear'
              ? 'Crear cliente'
              : 'Guardar cambios'}
        </Button>
      </div>

      {/* Autollenar con CSF (IA) — solo al crear */}
      {mode === 'crear' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-muted/40 p-3">
          <input
            ref={archivoCsfRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={onArchivoCsf}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => archivoCsfRef.current?.click()}
            disabled={extraerCsf.isPending}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {extraerCsf.isPending
              ? 'Leyendo constancia…'
              : 'Autollenar con Constancia (IA)'}
          </Button>
          <span className="text-xs text-muted-foreground">
            Sube la Constancia de Situación Fiscal (PDF o foto) y la IA prellenará
            razón social, RFC, régimen, C.P. y domicilio. Revísalos.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Datos generales */}
        <Seccion titulo="Datos generales">
          <CamposGrid cols={2}>
            <Campo
              label="Razón social"
              htmlFor="razonSocial"
              required
              error={errors.razonSocial?.message}
              full
            >
              <Input id="razonSocial" {...register('razonSocial')} autoFocus />
            </Campo>
            <Campo label="Dirección" htmlFor="direccion" error={errors.direccion?.message} full>
              <Input id="direccion" {...register('direccion')} placeholder="Calle, número, colonia, ciudad" />
            </Campo>
          </CamposGrid>
        </Seccion>

        {/* Datos fiscales */}
        <Seccion titulo="Datos fiscales (CFDI 4.0)">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Atajos:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => aplicarPublicoGeneral(false)}
            >
              Público en general
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => aplicarPublicoGeneral(true)}
            >
              Público en general (internacional)
            </Button>
          </div>
          <CamposGrid cols={2}>
            <Campo label="RFC" htmlFor="rfc" error={errors.rfc?.message}>
              <Input id="rfc" {...register('rfc')} placeholder="XAXX010101000" />
            </Campo>
            <Campo label="C.P. fiscal" htmlFor="cpFiscal" error={errors.cpFiscal?.message}>
              <Input id="cpFiscal" {...register('cpFiscal')} placeholder="00000" inputMode="numeric" />
            </Campo>
            <Campo label="Régimen fiscal" htmlFor="regimenFiscal" error={errors.regimenFiscal?.message}>
              <Controller
                control={control}
                name="regimenFiscal"
                render={({ field }) => (
                  <CatalogoSelect
                    id="regimenFiscal"
                    grupo="REGIMEN_FISCAL"
                    value={field.value || null}
                    onChange={field.onChange}
                    placeholder="Selecciona…"
                  />
                )}
              />
            </Campo>
            <Campo label="Uso CFDI" htmlFor="usoCfdi" error={errors.usoCfdi?.message}>
              <Controller
                control={control}
                name="usoCfdi"
                render={({ field }) => (
                  <CatalogoSelect
                    id="usoCfdi"
                    grupo="USO_CFDI"
                    value={field.value || null}
                    onChange={field.onChange}
                    placeholder="Selecciona…"
                  />
                )}
              />
            </Campo>
            <Campo
              label="Correo de facturación"
              htmlFor="emailFacturacion"
              error={errors.emailFacturacion?.message}
              full
            >
              <Input id="emailFacturacion" type="email" {...register('emailFacturacion')} />
            </Campo>
          </CamposGrid>
        </Seccion>
      </div>

      {/* Contactos */}
      <Seccion titulo="Contactos">
        <div className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sin contactos. Agrega al menos uno para poder cotizar/enviar correos.
            </p>
          )}
          {fields.map((f, i) => {
            const errContacto = errors.contactos?.[i];
            return (
              <div key={f.id} className="rounded-md border p-3">
                <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-[1.5fr_1.5fr_1fr_auto]">
                  <Campo label="Nombre" required error={errContacto?.nombre?.message}>
                    <Input {...register(`contactos.${i}.nombre`)} placeholder="Nombre del contacto" />
                  </Campo>
                  <Campo label="Correo" error={errContacto?.email?.message}>
                    <Input type="email" {...register(`contactos.${i}.email`)} placeholder="correo@dominio.com" />
                  </Campo>
                  <Campo label="Celular" error={errContacto?.telefono?.message}>
                    <Input {...register(`contactos.${i}.telefono`)} placeholder="10 dígitos" inputMode="tel" />
                  </Campo>
                  <div className="flex items-end gap-1 pb-0.5">
                    <Controller
                      control={control}
                      name={`contactos.${i}.esPrincipal`}
                      render={({ field }) => (
                        <Button
                          type="button"
                          variant={field.value ? 'default' : 'outline'}
                          size="icon"
                          aria-label={field.value ? 'Contacto principal' : 'Marcar como principal'}
                          title={field.value ? 'Contacto principal' : 'Marcar como principal'}
                          onClick={() => marcarPrincipal(i)}
                        >
                          <Star className={field.value ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
                        </Button>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar contacto"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...CONTACTO_VACIO, esPrincipal: fields.length === 0 })}
          >
            <Plus className="h-4 w-4" /> Agregar contacto
          </Button>
        </div>
      </Seccion>

      {/* Sucursales: gestión propia (requiere un cliente ya guardado). */}
      {mode === 'editar' && cliente && (
        <SucursalesClienteSection clienteId={cliente.id} />
      )}
    </form>
  );
}
