'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Conductor } from '@/components/conductores/types';
import { DatosTab } from '@/components/conductores/expediente/datos-tab';
import { DocumentosTab } from '@/components/conductores/expediente/documentos-tab';
import { MedicoTab } from '@/components/conductores/expediente/examenes-medicos-tab';
import { CertificacionesTab } from '@/components/conductores/expediente/certificaciones-tab';
import { CapacitacionesTab } from '@/components/conductores/expediente/capacitaciones-tab';
import { ControlConfianzaTab } from '@/components/conductores/expediente/control-confianza-tab';
import { AptitudesTab } from '@/components/conductores/expediente/aptitudes-unidad-tab';
import { IncidenciasTab } from '@/components/conductores/expediente/incidencias-tab';
import { EvaluacionesTab } from '@/components/conductores/expediente/evaluaciones-tab';
import { ProgresoTab } from '@/components/conductores/expediente/eventos-laborales-tab';
import { AusenciasTab } from '@/components/conductores/expediente/ausencias-tab';

const SECCIONES = [
  { value: 'datos', label: 'Datos / RH' },
  { value: 'documentos', label: 'Documentación' },
  { value: 'medico', label: 'Médico' },
  { value: 'certificaciones', label: 'Certificaciones' },
  { value: 'capacitaciones', label: 'Capacitaciones' },
  { value: 'confianza', label: 'Control de confianza' },
  { value: 'aptitudes', label: 'Aptitud por unidad' },
  { value: 'incidencias', label: 'Incidencias' },
  { value: 'evaluaciones', label: 'Evaluaciones' },
  { value: 'progreso', label: 'Progreso' },
  { value: 'ausencias', label: 'Ausencias' },
];

export default function ExpedienteConductorPage() {
  const params = useParams();
  const conductorId = String(params.id);

  const { data: conductor, isLoading } = useQuery({
    queryKey: ['conductor', conductorId],
    queryFn: async () => {
      const { data } = await api.get<Conductor>(`/conductores/${conductorId}`);
      return data;
    },
    enabled: Boolean(conductorId),
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
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Expediente — {nombre}
              {conductor && (
                <Badge variant={conductor.activo ? 'success' : 'secondary'}>
                  {conductor.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              )}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            Expediente formal del conductor: documentación, médico, certificaciones, desempeño e incidencias.
          </p>
        </div>
      </div>

      <Tabs defaultValue="datos" className="w-full">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {SECCIONES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="datos"><DatosTab conductorId={conductorId} /></TabsContent>
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
        </div>
      </Tabs>
    </div>
  );
}
