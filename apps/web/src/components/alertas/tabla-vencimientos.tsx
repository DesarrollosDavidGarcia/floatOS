'use client';

import { CheckCircle2, Truck, User } from 'lucide-react';
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
  CeldaPrincipal,
  Vigencia,
} from '@/components/conductores/expediente/tabla-ui';
import { CatalogoTexto } from '@/components/catalogos/catalogo-badge';
import type { VencimientoAlerta } from './tipos';

// ─── helpers ────────────────────────────────────────────────────────────────

function TipoIcon({ tipo }: { tipo: VencimientoAlerta['tipo'] }) {
  return tipo === 'unidad' ? (
    <Truck className="h-3.5 w-3.5" />
  ) : (
    <User className="h-3.5 w-3.5" />
  );
}

// ─── componente principal ────────────────────────────────────────────────────

export function TablaVencimientos({ items }: { items: VencimientoAlerta[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border py-14 text-center">
        <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          Sin vencimientos en este rango
        </p>
        <p className="text-xs text-muted-foreground/70">
          Todos los documentos están vigentes dentro del período seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table className="[&_td]:py-1.5 [&_th]:h-9">
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs uppercase text-muted-foreground">
              Entidad
            </TableHead>
            <TableHead className="text-xs uppercase text-muted-foreground">
              Tipo
            </TableHead>
            <TableHead className="text-xs uppercase text-muted-foreground">
              Documento
            </TableHead>
            <TableHead className="text-xs uppercase text-muted-foreground">
              Vencimiento
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow
              key={`${item.tipo}-${item.entidad}-${item.tipoDocumento}-${index}`}
            >
              {/* Entidad: nombre + subtexto con tipo de documento */}
              <TableCell>
                <CeldaPrincipal
                  titulo={item.entidad}
                  subtitulo={
                    <CatalogoTexto
                      grupo={
                        item.tipo === 'unidad'
                          ? 'TIPO_DOCUMENTO_UNIDAD'
                          : 'TIPO_DOCUMENTO_CONDUCTOR'
                      }
                      codigo={item.tipoDocumento}
                    />
                  }
                />
              </TableCell>

              {/* Tipo */}
              <TableCell>
                <Badge variant="outline" className="gap-1">
                  <TipoIcon tipo={item.tipo} />
                  {item.tipo === 'unidad' ? 'Unidad' : 'Conductor'}
                </Badge>
              </TableCell>

              {/* Documento (catálogo) */}
              <TableCell>
                <CatalogoTexto
                  grupo={
                    item.tipo === 'unidad'
                      ? 'TIPO_DOCUMENTO_UNIDAD'
                      : 'TIPO_DOCUMENTO_CONDUCTOR'
                  }
                  codigo={item.tipoDocumento}
                />
              </TableCell>

              {/* Vigencia: badge + fecha */}
              <TableCell>
                <Vigencia iso={item.fechaVencimiento} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
