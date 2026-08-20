'use client';

import { useParams } from 'next/navigation';
import { UnidadFicha } from '@/components/flota/unidad-ficha';

export default function UnidadFichaPage() {
  const params = useParams();
  return <UnidadFicha unidadId={String(params.id)} />;
}
