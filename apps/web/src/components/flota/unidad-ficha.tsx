'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Coins, FileText, Files, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import { UnidadDatosForm } from './unidad-datos-form';
import { CostosUnidadCard } from './costos-unidad-card';
import { DocumentosDialog } from './documentos-dialog';
import { SeccionArchivos } from './archivos-dialog';
import { UnidadFotoUploader } from './unidad-foto';
import type { Unidad } from './types';

/**
 * Ficha completa de la unidad. Los datos de flota (capacidades, consumo y sobre
 * todo los costos) son demasiados para un modal, así que viven en su propia
 * página con secciones. El modal se queda para el alta rápida.
 */
export function UnidadFicha({ unidadId }: { unidadId: string }) {
  const [documentosAbierto, setDocumentosAbierto] = useState(false);

  const { data: unidad, isLoading, isError } = useQuery({
    queryKey: ['unidad', unidadId],
    queryFn: async () => {
      const { data } = await api.get<Unidad>(`/unidades/${unidadId}`);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/flota" title="Volver a la flota">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {unidad?.placas ?? 'Unidad'}
              {unidad && (
                <>
                  <Badge variant="outline">
                    <CatalogoTexto grupo="TIPO_UNIDAD" codigo={unidad.tipo} />
                  </Badge>
                  <Badge variant={unidad.activo ? 'success' : 'secondary'}>
                    {unidad.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </>
              )}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            Datos, capacidades, costos de operación y archivos de la unidad.
          </p>
        </div>
        <Button variant="outline" onClick={() => setDocumentosAbierto(true)} disabled={!unidad}>
          <FileText className="mr-2 h-4 w-4" />
          Documentos
        </Button>
      </div>

      {isError && (
        <p className="rounded-md border p-4 text-sm text-destructive">
          No se pudo cargar la unidad.
        </p>
      )}

      {isLoading || !unidad ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="datos" className="w-full">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="datos" className="gap-1.5">
              <Truck className="h-4 w-4" />
              Datos
            </TabsTrigger>
            <TabsTrigger value="costos" className="gap-1.5">
              <Coins className="h-4 w-4" />
              Costos de operación
            </TabsTrigger>
            <TabsTrigger value="archivos" className="gap-1.5">
              <Files className="h-4 w-4" />
              Archivos
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="datos">
              <div className="space-y-4">
                <UnidadFotoUploader unidad={unidad} />
                <UnidadDatosForm unidad={unidad} />
              </div>
            </TabsContent>

            <TabsContent value="costos">
              <CostosUnidadCard unidadId={unidad.id} />
            </TabsContent>

            <TabsContent value="archivos">
              <div className="space-y-4">
                <SeccionArchivos
                  unidadId={unidad.id}
                  categoria="POLIZA_SEGURO"
                  titulo="Póliza de seguro"
                  descripcion="Carátula, endosos y demás documentos de la póliza."
                />
                <SeccionArchivos
                  unidadId={unidad.id}
                  categoria="GENERAL"
                  titulo="Archivos del vehículo"
                  descripcion="Factura, fotos, manuales u otros documentos propios."
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      )}

      <DocumentosDialog
        unidad={unidad ?? null}
        open={documentosAbierto}
        onOpenChange={setDocumentosAbierto}
      />
    </div>
  );
}
