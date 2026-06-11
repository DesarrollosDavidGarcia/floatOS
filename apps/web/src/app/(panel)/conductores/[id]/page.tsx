'use client';

import { useParams } from 'next/navigation';
import { ConductorExpediente } from '@/components/conductores/expediente/conductor-expediente';

export default function ExpedienteConductorPage() {
  const params = useParams();
  const conductorId = String(params.id);
  return <ConductorExpediente mode="editar" conductorId={conductorId} />;
}
