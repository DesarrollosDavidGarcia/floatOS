'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  FileText,
  Stethoscope,
  Award,
  GraduationCap,
  ShieldCheck,
  Truck,
  AlertTriangle,
  ClipboardCheck,
  TrendingUp,
  CalendarOff,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import type { Conductor } from '@/components/conductores/types';
import { ConductorDatosForm } from './conductor-datos-form';
import { DocumentosTab } from './documentos-tab';
import { MedicoTab } from './examenes-medicos-tab';
import { CertificacionesTab } from './certificaciones-tab';
import { CapacitacionesTab } from './capacitaciones-tab';
import { ControlConfianzaTab } from './control-confianza-tab';
import { AptitudesTab } from './aptitudes-unidad-tab';
import { IncidenciasTab } from './incidencias-tab';
import { EvaluacionesTab } from './evaluaciones-tab';
import { ProgresoTab } from './eventos-laborales-tab';
import { AusenciasTab } from './ausencias-tab';

const SECCIONES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'datos', label: 'Datos', icon: User },
  { value: 'documentos', label: 'Documentación', icon: FileText },
  { value: 'medico', label: 'Médico', icon: Stethoscope },
  { value: 'certificaciones', label: 'Certificaciones', icon: Award },
  { value: 'capacitaciones', label: 'Capacitaciones', icon: GraduationCap },
  { value: 'confianza', label: 'Control de confianza', icon: ShieldCheck },
  { value: 'aptitudes', label: 'Aptitud por unidad', icon: Truck },
  { value: 'incidencias', label: 'Incidencias', icon: AlertTriangle },
  { value: 'evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
  { value: 'progreso', label: 'Progreso', icon: TrendingUp },
  { value: 'ausencias', label: 'Ausencias', icon: CalendarOff },
];

/**
 * Pantalla unificada del conductor (alta + expediente). La pestaña "Datos"
 * captura/edita todos los campos escalares; el resto son colecciones del
 * expediente que requieren un conductor ya guardado (deshabilitadas al crear).
 */
export function ConductorExpediente({
  mode,
  conductorId,
}: {
  mode: 'crear' | 'editar';
  conductorId?: string;
}) {
  const router = useRouter();
  const esCrear = mode === 'crear';

  const { data: conductor, isLoading } = useQuery({
    queryKey: ['conductor', conductorId],
    queryFn: async () => {
      const { data } = await api.get<Conductor>(`/conductores/${conductorId}`);
      return data;
    },
    enabled: !esCrear && Boolean(conductorId),
  });

  const nombre = conductor
    ? `${conductor.nombre}${conductor.apellidos ? ` ${conductor.apellidos}` : ''}`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/conductores" title="Volver a conductores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          {esCrear ? (
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Nuevo conductor</h1>
          ) : isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Expediente — {nombre}
              {conductor && (
                <Badge variant={conductor.activo ? 'success' : 'secondary'}>
                  {conductor.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              )}
              {conductor?.tipoContratacion && conductor.tipoContratacion !== 'PLANTA' && (
                <Badge variant="outline">
                  <CatalogoTexto grupo="TIPO_CONTRATACION" codigo={conductor.tipoContratacion} />
                </Badge>
              )}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            {esCrear
              ? 'Captura todos los datos del conductor. Las demás secciones se habilitan al guardar.'
              : 'Expediente formal: datos, documentación, médico, certificaciones, desempeño e incidencias.'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="datos" className="w-full">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {SECCIONES.map((s) => (
            <TabsTrigger
              key={s.value}
              value={s.value}
              disabled={esCrear && s.value !== 'datos'}
              className="gap-1.5"
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="datos">
            <ConductorDatosForm
              mode={mode}
              conductor={conductor}
              onCreated={(c) => router.replace(`/conductores/${c.id}`)}
            />
          </TabsContent>

          {/* Colecciones del expediente: solo cuando ya existe el conductor. */}
          {!esCrear && conductorId && (
            <>
              <TabsContent value="documentos"><DocumentosTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="medico"><MedicoTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="certificaciones"><CertificacionesTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="capacitaciones"><CapacitacionesTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="confianza"><ControlConfianzaTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="aptitudes"><AptitudesTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="incidencias"><IncidenciasTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="evaluaciones"><EvaluacionesTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="progreso"><ProgresoTab conductorId={conductorId} /></TabsContent>
              <TabsContent value="ausencias"><AusenciasTab conductorId={conductorId} /></TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
