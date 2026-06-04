'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Truck, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  etiquetaDocumento,
  textoDiasRestantes,
  variantePorDias,
  type VencimientoAlerta,
} from './tipos';

function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function TablaVencimientos({ items }: { items: VencimientoAlerta[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border py-12 text-center text-sm text-muted-foreground">
        Sin vencimientos en el rango.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entidad</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Fecha de vencimiento</TableHead>
            <TableHead className="text-right">Días restantes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={`${item.tipo}-${item.entidad}-${item.tipoDocumento}-${index}`}>
              <TableCell className="font-medium">{item.entidad}</TableCell>
              <TableCell>
                <Badge variant="outline" className="gap-1">
                  {item.tipo === 'unidad' ? (
                    <Truck className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  {item.tipo === 'unidad' ? 'Unidad' : 'Conductor'}
                </Badge>
              </TableCell>
              <TableCell>{etiquetaDocumento(item.tipoDocumento)}</TableCell>
              <TableCell>{formatFecha(item.fechaVencimiento)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={variantePorDias(item.diasRestantes)}>
                  {textoDiasRestantes(item.diasRestantes)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
