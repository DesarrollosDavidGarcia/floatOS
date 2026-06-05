import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AlertaVencimiento } from './alertas.types';
import {
  diasEntre,
  finDelDiaUTC,
  inicioDelDiaUTC,
  rangoDiaUTC,
  sumarDias,
} from '../shared/fecha.util';

/**
 * Caso de uso de escaneo de vencimientos de documentos.
 *
 * Combina DocumentoUnidad y DocumentoConductor. Se usa tanto para el job
 * diario de la cola (umbrales exactos 7/3/1 días) como para el endpoint
 * on-demand del centro de alertas (todo lo que vence dentro de N días).
 */
@Injectable()
export class EscaneoVencimientosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Documentos cuya fechaVencimiento cae en [inicioDelDiaUTC(hoy),
   * finDelDiaUTC(hoy + dias)]: incluye desde hoy hasta hoy+dias y EXCLUYE lo
   * vencido hace tiempo. Ordenados por fechaVencimiento ascendente.
   *
   * @param dias  Ventana de días hacia adelante (a partir de hoy, UTC).
   * @param ahora Fecha de referencia (inyectable para pruebas).
   */
  async listarPorVencer(
    dias: number,
    ahora: Date = new Date(),
  ): Promise<AlertaVencimiento[]> {
    const hoy = inicioDelDiaUTC(ahora);
    const limite = finDelDiaUTC(sumarDias(ahora, dias));

    const [docsUnidad, docsConductor] = await Promise.all([
      this.prisma.documentoUnidad.findMany({
        where: { fechaVencimiento: { gte: hoy, lte: limite } },
        include: { unidad: { select: { placas: true } } },
        orderBy: { fechaVencimiento: 'asc' },
      }),
      this.prisma.documentoConductor.findMany({
        where: { fechaVencimiento: { gte: hoy, lte: limite } },
        include: { conductor: { select: { nombre: true, apellidos: true } } },
        orderBy: { fechaVencimiento: 'asc' },
      }),
    ]);

    return this.ordenarPorVencimiento([
      ...docsUnidad.map((doc) => this.aAlertaUnidad(doc, ahora)),
      ...docsConductor.map((doc) => this.aAlertaConductor(doc, ahora)),
    ]);
  }

  /**
   * Documentos cuya fechaVencimiento cae EXACTAMENTE a `umbrales` días del
   * día de hoy (por día calendario UTC). Lo usa el job diario de la cola.
   *
   * Eficiencia: una sola query por tabla con un OR de los rangos de cada
   * umbral; diasRestantes se calcula por documento con diasEntre.
   *
   * @param umbrales Días exactos a notificar, p. ej. [7, 3, 1].
   * @param ahora    Fecha de referencia (inyectable para pruebas).
   */
  async escanearUmbrales(
    umbrales: number[],
    ahora: Date = new Date(),
  ): Promise<AlertaVencimiento[]> {
    // OR de los rangos [gte, lt) de cada umbral (día calendario UTC exacto).
    const rangos = umbrales.map((dias) => {
      const { gte, lt } = rangoDiaUTC(dias, ahora);
      return { fechaVencimiento: { gte, lt } };
    });

    if (rangos.length === 0) {
      return [];
    }

    const [docsUnidad, docsConductor] = await Promise.all([
      this.prisma.documentoUnidad.findMany({
        where: { OR: rangos },
        include: { unidad: { select: { placas: true } } },
      }),
      this.prisma.documentoConductor.findMany({
        where: { OR: rangos },
        include: { conductor: { select: { nombre: true, apellidos: true } } },
      }),
    ]);

    return this.ordenarPorVencimiento([
      ...docsUnidad.map((doc) => this.aAlertaUnidad(doc, ahora)),
      ...docsConductor.map((doc) => this.aAlertaConductor(doc, ahora)),
    ]);
  }

  /** Mapea un documento de unidad a una alerta de vencimiento. */
  private aAlertaUnidad(
    doc: { tipo: string; fechaVencimiento: Date; unidad: { placas: string } },
    ahora: Date,
  ): AlertaVencimiento {
    return {
      tipo: 'unidad',
      entidad: doc.unidad.placas,
      tipoDocumento: doc.tipo,
      fechaVencimiento: doc.fechaVencimiento,
      diasRestantes: diasEntre(ahora, doc.fechaVencimiento),
    };
  }

  /** Mapea un documento de conductor a una alerta de vencimiento. */
  private aAlertaConductor(
    doc: {
      tipo: string;
      fechaVencimiento: Date;
      conductor: { nombre: string | null; apellidos: string | null };
    },
    ahora: Date,
  ): AlertaVencimiento {
    return {
      tipo: 'conductor',
      entidad: this.nombreConductor(doc.conductor),
      tipoDocumento: doc.tipo,
      fechaVencimiento: doc.fechaVencimiento,
      diasRestantes: diasEntre(ahora, doc.fechaVencimiento),
    };
  }

  /** Ordena las alertas por fecha de vencimiento ascendente (in place). */
  private ordenarPorVencimiento(
    alertas: AlertaVencimiento[],
  ): AlertaVencimiento[] {
    return alertas.sort(
      (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime(),
    );
  }

  /** Construye el nombre legible del conductor (nombre + apellidos). */
  private nombreConductor(conductor: {
    nombre: string | null;
    apellidos: string | null;
  }): string {
    return [conductor.nombre, conductor.apellidos]
      .filter((p): p is string => Boolean(p))
      .join(' ');
  }
}
