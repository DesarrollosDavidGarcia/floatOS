import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EstadoViaje } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { CambiarEstadoViajeUseCase } from './cambiar-estado-viaje.usecase';

/** Datos del reporte de incidencia que envía el conductor (o el admin). */
export interface ReportarIncidenciaInput {
  tipo: string;
  descripcion?: string;
  gravedad?: string;
  lugar?: string;
  /** Si true y el viaje está en ruta, lo deja en VARADO (pausa recuperable). */
  marcarVarado?: boolean;
}

/** Estados desde los que tiene sentido marcar VARADO al reportar. */
const ESTADOS_EN_RUTA: ReadonlySet<EstadoViaje> = new Set([
  EstadoViaje.EN_CAMINO_ORIGEN,
  EstadoViaje.CARGANDO,
  EstadoViaje.EN_TRANSITO,
]);

const TIPO_LABEL: Record<string, string> = {
  AVERIA: 'Avería',
  ACCIDENTE: 'Accidente',
  PONCHADURA: 'Ponchadura',
  PANICO: 'Pánico / SOS',
  OTRO: 'Problema',
};

function nombreConductor(c: { nombre: string; apellidos: string | null } | null): string | null {
  if (!c) return null;
  return `${c.nombre} ${c.apellidos ?? ''}`.trim();
}

/**
 * Caso de uso: el conductor (o admin) reporta una incidencia operativa de un
 * viaje (avería/choque/etc.). Crea la IncidenciaConductor ligada al viaje,
 * opcionalmente deja el viaje en VARADO, y avisa al panel por WS.
 */
@Injectable()
export class ReportarIncidenciaViajeUseCase {
  private readonly logger = new Logger(ReportarIncidenciaViajeUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingGateway,
    private readonly cambiarEstado: CambiarEstadoViajeUseCase,
  ) {}

  async execute(
    viajeId: string,
    input: ReportarIncidenciaInput,
    registradoPor: string,
    conductorId?: string,
  ) {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: {
        id: true,
        folio: true,
        estado: true,
        conductorId: true,
        conductor: { select: { nombre: true, apellidos: true } },
      },
    });
    if (!viaje) {
      throw new NotFoundException(`Viaje con id ${viajeId} no encontrado`);
    }
    if (conductorId && viaje.conductorId !== conductorId) {
      throw new BadRequestException(
        'No tiene permiso para reportar en este viaje',
      );
    }
    if (!viaje.conductorId) {
      throw new BadRequestException(
        'El viaje no tiene conductor asignado',
      );
    }

    const etiqueta = TIPO_LABEL[input.tipo] ?? 'Incidencia';
    const titulo = `${etiqueta} — Viaje #${viaje.folio}`;
    const gravedad = input.gravedad?.trim() || 'ALTA';

    const incidencia = await this.prisma.incidenciaConductor.create({
      data: {
        conductorId: viaje.conductorId,
        viajeId,
        tipo: input.tipo,
        gravedad,
        titulo,
        descripcion: input.descripcion?.trim() || null,
        fecha: new Date(),
        lugar: input.lugar?.trim() || null,
        registradoPor,
      },
    });

    // Si se pidió y el viaje está en ruta, lo deja en VARADO (reutiliza la
    // transición validada del use case de estado: historial + WS + estado previo).
    // Best-effort: la incidencia ya quedó registrada; si la pausa falla (p. ej. el
    // estado cambió concurrentemente → 409), NO se pierde el reporte ni el aviso
    // al panel, solo `varado` queda en false.
    let varado = false;
    if (input.marcarVarado && ESTADOS_EN_RUTA.has(viaje.estado as EstadoViaje)) {
      try {
        await this.cambiarEstado.execute(
          viajeId,
          { estado: EstadoViaje.VARADO, nota: titulo },
          registradoPor,
          conductorId,
        );
        varado = true;
      } catch (e) {
        this.logger.warn(
          `Incidencia registrada pero no se pudo marcar VARADO (viaje ${viajeId}): ${(e as Error).message}`,
        );
      }
    }

    this.tracking.emitirIncidencia({
      viajeId,
      folio: viaje.folio,
      tipo: input.tipo,
      titulo,
      gravedad,
      descripcion: incidencia.descripcion,
      conductorNombre: nombreConductor(viaje.conductor),
      varado,
      reportadoEn: new Date().toISOString(),
    });

    return { incidencia, varado };
  }
}
