'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, Building2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CatalogoSelect } from '@/components/catalogos/catalogo-select';

/** Campos de texto editables (mismo orden que el DTO del backend). */
const CAMPOS_TEXTO = [
  'razonSocial', 'rfc', 'regimenFiscal', 'telefono', 'email',
  'calle', 'numeroExt', 'numeroInt', 'colonia', 'cp', 'municipio', 'estado', 'pais',
  'permisoSctTipo', 'permisoSctNumero', 'aseguradoraRespCivil', 'polizaRespCivil',
  'pacProveedor', 'pacAmbiente', 'pacUsuario', 'csdNumero',
] as const;

type CampoTexto = (typeof CAMPOS_TEXTO)[number];
type FormState = Record<CampoTexto, string>;

interface EmpresaConfig extends Partial<Record<CampoTexto, string | null>> {
  tieneLogo: boolean;
  tienePacToken: boolean;
  tienePacPassword: boolean;
  tieneCsdCer: boolean;
  tieneCsdKey: boolean;
  tieneCsdPassword: boolean;
}

const VACIO: FormState = CAMPOS_TEXTO.reduce(
  (acc, k) => ({ ...acc, [k]: '' }),
  {} as FormState,
);

function Campo({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function ConfiguracionPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(VACIO);
  const [pacToken, setPacToken] = useState('');
  const [pacPassword, setPacPassword] = useState('');
  const [csdPassword, setCsdPassword] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const cerRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<EmpresaConfig>({
    queryKey: ['empresa'],
    queryFn: async () => (await api.get<EmpresaConfig>('/empresa')).data,
  });

  const { data: logo } = useQuery<{ url: string | null }>({
    queryKey: ['empresa-logo'],
    queryFn: async () => (await api.get<{ url: string | null }>('/empresa/logo')).data,
  });

  useEffect(() => {
    if (!data) return;
    setForm(
      CAMPOS_TEXTO.reduce(
        (acc, k) => ({ ...acc, [k]: (data[k] as string | null) ?? '' }),
        {} as FormState,
      ),
    );
  }, [data]);

  const set = (k: CampoTexto, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { ...form };
      if (pacToken.trim()) payload.pacToken = pacToken.trim();
      if (pacPassword.trim()) payload.pacPassword = pacPassword.trim();
      await api.patch('/empresa', payload);
    },
    onSuccess: () => {
      toast.success('Configuración guardada');
      setPacToken('');
      setPacPassword('');
      qc.invalidateQueries({ queryKey: ['empresa'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const subirLogo = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      await api.post('/empresa/logo', fd, { headers: { 'Content-Type': undefined } });
    },
    onSuccess: () => {
      toast.success('Logo actualizado');
      qc.invalidateQueries({ queryKey: ['empresa'] });
      qc.invalidateQueries({ queryKey: ['empresa-logo'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const guardarCsd = useMutation({
    mutationFn: async () => {
      const cer = cerRef.current?.files?.[0];
      const key = keyRef.current?.files?.[0];
      if (!cer && !key && !csdPassword.trim()) {
        throw new Error('Selecciona el .cer/.key o captura la contraseña.');
      }
      const fd = new FormData();
      if (cer) fd.append('cer', cer);
      if (key) fd.append('key', key);
      if (csdPassword.trim()) fd.append('password', csdPassword.trim());
      await api.post('/empresa/csd', fd, { headers: { 'Content-Type': undefined } });
    },
    onSuccess: () => {
      toast.success('CSD guardado');
      setCsdPassword('');
      if (cerRef.current) cerRef.current.value = '';
      if (keyRef.current) keyRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['empresa'] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : apiError(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de tu empresa (emisor), domicilio fiscal y credenciales para timbrar Carta Porte.
        </p>
      </div>

      {/* Datos generales + logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mi empresa (emisor)</CardTitle>
          <CardDescription>Datos generales y fiscales que aparecen en documentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted/30">
              {logo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) subirLogo.mutate(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={subirLogo.isPending}
                onClick={() => logoRef.current?.click()}
              >
                {subirLogo.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                {data?.tieneLogo ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG o WEBP · máx 2 MB</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Razón social" className="sm:col-span-2">
              <Input value={form.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} />
            </Campo>
            <Campo label="RFC">
              <Input value={form.rfc} onChange={(e) => set('rfc', e.target.value.toUpperCase())} />
            </Campo>
            <Campo label="Régimen fiscal">
              <CatalogoSelect
                grupo="REGIMEN_FISCAL"
                value={form.regimenFiscal}
                onChange={(c) => set('regimenFiscal', c)}
                placeholder="Selecciona…"
              />
            </Campo>
            <Campo label="Teléfono">
              <Input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            </Campo>
            <Campo label="Email">
              <Input value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Campo>
          </div>
        </CardContent>
      </Card>

      {/* Domicilio fiscal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domicilio fiscal</CardTitle>
          <CardDescription>Usado como lugar de expedición en Carta Porte.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo label="Calle" className="sm:col-span-2 lg:col-span-1">
              <Input value={form.calle} onChange={(e) => set('calle', e.target.value)} />
            </Campo>
            <Campo label="Núm. exterior">
              <Input value={form.numeroExt} onChange={(e) => set('numeroExt', e.target.value)} />
            </Campo>
            <Campo label="Núm. interior">
              <Input value={form.numeroInt} onChange={(e) => set('numeroInt', e.target.value)} />
            </Campo>
            <Campo label="Colonia">
              <Input value={form.colonia} onChange={(e) => set('colonia', e.target.value)} />
            </Campo>
            <Campo label="C.P.">
              <Input value={form.cp} onChange={(e) => set('cp', e.target.value)} inputMode="numeric" />
            </Campo>
            <Campo label="Municipio">
              <Input value={form.municipio} onChange={(e) => set('municipio', e.target.value)} />
            </Campo>
            <Campo label="Estado">
              <Input value={form.estado} onChange={(e) => set('estado', e.target.value)} />
            </Campo>
            <Campo label="País">
              <Input value={form.pais} onChange={(e) => set('pais', e.target.value)} />
            </Campo>
          </div>
        </CardContent>
      </Card>

      {/* Carta Porte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Carta Porte</CardTitle>
          <CardDescription>Permiso SCT y seguro de responsabilidad civil del autotransporte.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Tipo de permiso SCT">
              <CatalogoSelect
                grupo="TIPO_PERMISO_SCT"
                value={form.permisoSctTipo}
                onChange={(c) => set('permisoSctTipo', c)}
                placeholder="Selecciona…"
              />
            </Campo>
            <Campo label="Número de permiso SCT">
              <Input value={form.permisoSctNumero} onChange={(e) => set('permisoSctNumero', e.target.value)} />
            </Campo>
            <Campo label="Aseguradora (resp. civil)">
              <Input value={form.aseguradoraRespCivil} onChange={(e) => set('aseguradoraRespCivil', e.target.value)} />
            </Campo>
            <Campo label="Póliza (resp. civil)">
              <Input value={form.polizaRespCivil} onChange={(e) => set('polizaRespCivil', e.target.value)} />
            </Campo>
          </div>
        </CardContent>
      </Card>

      {/* PAC / timbrado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timbrado (PAC)</CardTitle>
          <CardDescription>
            Credenciales del PAC para timbrar. Los secretos no se muestran; déjalos en
            blanco para conservarlos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Proveedor (PAC)">
              <Input value={form.pacProveedor} onChange={(e) => set('pacProveedor', e.target.value)} placeholder="SW" />
            </Campo>
            <Campo label="Ambiente">
              <Select value={form.pacAmbiente || 'PRUEBAS'} onValueChange={(v) => set('pacAmbiente', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRUEBAS">Pruebas (sandbox)</SelectItem>
                  <SelectItem value="PRODUCCION">Producción</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Usuario PAC">
              <Input value={form.pacUsuario} onChange={(e) => set('pacUsuario', e.target.value)} />
            </Campo>
            <Campo label={`Token PAC ${data?.tienePacToken ? '(configurado)' : ''}`}>
              <Input
                type="password"
                value={pacToken}
                onChange={(e) => setPacToken(e.target.value)}
                placeholder={data?.tienePacToken ? '•••••••• (sin cambios)' : 'Token de SW Sapien'}
              />
            </Campo>
            <Campo label={`Contraseña PAC ${data?.tienePacPassword ? '(configurada)' : ''}`}>
              <Input
                type="password"
                value={pacPassword}
                onChange={(e) => setPacPassword(e.target.value)}
                placeholder={data?.tienePacPassword ? '•••••••• (sin cambios)' : ''}
              />
            </Campo>
          </div>

          {/* CSD: archivos + contraseña (guardado aparte) */}
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">Certificado de Sello Digital (CSD)</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Archivos .cer y .key del SAT + su contraseña. Se usan para el timbrado.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={`Certificado .cer ${data?.tieneCsdCer ? '(cargado)' : ''}`}>
                <Input ref={cerRef} type="file" accept=".cer" />
              </Campo>
              <Campo label={`Llave .key ${data?.tieneCsdKey ? '(cargada)' : ''}`}>
                <Input ref={keyRef} type="file" accept=".key" />
              </Campo>
              <Campo label="Número de certificado">
                <Input value={form.csdNumero} onChange={(e) => set('csdNumero', e.target.value)} />
              </Campo>
              <Campo label={`Contraseña del CSD ${data?.tieneCsdPassword ? '(configurada)' : ''}`}>
                <Input
                  type="password"
                  value={csdPassword}
                  onChange={(e) => setCsdPassword(e.target.value)}
                  placeholder={data?.tieneCsdPassword ? '•••••••• (sin cambios)' : ''}
                />
              </Campo>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={guardarCsd.isPending}
                onClick={() => guardarCsd.mutate()}
              >
                {guardarCsd.isPending ? 'Guardando…' : 'Guardar CSD'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  );
}
