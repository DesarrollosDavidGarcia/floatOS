import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EstadoViaje } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RADIO_GEOCERCA_METROS } from '../../infrastructure/realtime/geo.util';
import { EmailService } from '../../infrastructure/email/email.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import {
  EscalaCercana,
  PuntoUbicacion,
  UbicacionPublica,
} from './tracking.types';

/**
 * Estados en los que NO tiene sentido evaluar geocercas de llegada: el viaje ya
 * terminó o se canceló. Evita avisos/emails fantasma por GPS residual.
 */
const ESTADOS_SIN_GEOCERCA: ReadonlySet<EstadoViaje> = new Set([
  EstadoViaje.VARADO,
  EstadoViaje.ENTREGADO,
  EstadoViaje.FACTURADO,
  EstadoViaje.CANCELADO,
]);

/** Escapa entidades HTML para interpolar texto libre del usuario en un correo. */
function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Caso de uso: ingesta de ubicaciones del conductor.
 * Guarda los puntos en UbicacionConductor, los reemite a la sala del viaje y
 * evalúa geocercas de llegada a cualquier ESCALA del itinerario usando PostGIS
 * (ST_DWithin sobre la columna geography indexada con GIST).
 */
@Injectable()
export class RegistrarUbicacionUseCase {
  private readonly logger = new Logger(RegistrarUbicacionUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
    private readonly email: EmailService,
  ) {}

  /** Registra un único punto. */
  async execute(
    viajeId: string,
    conductorId: string,
    punto: PuntoUbicacion,
  ): Promise<UbicacionPublica> {
    const [resultado] = await this.executeBatch(viajeId, conductorId, [punto]);
    return resultado;
  }

  /**
   * Registra un lote de puntos (sincronización offline) en una sola operación
   * atómica (createManyAndReturn). El WS sólo reemite el más reciente por
   * capturadoEn; las geocercas se evalúan sobre ese punto (PostGIS).
   */
  async executeBatch(
    viajeId: string,
    conductorId: string,
    puntos: PuntoUbicacion[],
  ): Promise<UbicacionPublica[]> {
    // Validamos que el viaje exista y que pertenezca al conductor autenticado.
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: { id: true, conductorId: true, estado: true },
    });

    if (!viaje || viaje.conductorId !== conductorId) {
      throw new NotFoundException('Viaje no encontrado');
    }

    // Inserción atómica de todos los puntos en una sola llamada (Prisma 6).
    const registros = await this.prisma.ubicacionConductor.createManyAndReturn({
      data: puntos.map((punto) => ({
        viajeId,
        conductorId,
        lat: punto.lat,
        lng: punto.lng,
        velocidad: punto.velocidad ?? null,
        rumbo: punto.rumbo ?? null,
        precision: punto.precision ?? null,
        capturadoEn: new Date(punto.capturadoEn),
      })),
    });

    const guardadas: UbicacionPublica[] = registros.map((registro) => ({
      id: registro.id,
      viajeId: registro.viajeId,
      lat: registro.lat,
      lng: registro.lng,
      velocidad: registro.velocidad,
      rumbo: registro.rumbo,
      precision: registro.precision,
      capturadoEn: registro.capturadoEn,
      createdAt: registro.createdAt,
    }));

    // Reemite por WS la ubicación más reciente (mayor capturadoEn).
    const masReciente = guardadas.reduce((acc, u) =>
      u.capturadoEn.getTime() > acc.capturadoEn.getTime() ? u : acc,
    );
    this.gateway.emitirUbicacion(viajeId, masReciente);

    // Geocercas por escala (PostGIS) sobre TODOS los puntos del lote, para no
    // perder llegadas ocurridas durante la sincronización offline. Se omite en
    // viajes ya cerrados (ENTREGADO/FACTURADO/CANCELADO) para no emitir avisos
    // ni emails fantasma por GPS residual.
    if (!ESTADOS_SIN_GEOCERCA.has(viaje.estado)) {
      await this.evaluarGeocercas(viajeId, guardadas);
    }

    return guardadas;
  }

  /**
   * Busca, vía PostGIS, las escalas del viaje dentro del radio de geocerca de
   * CUALQUIER punto del lote (índice GIST sobre `escalas_viaje.ubicacion`).
   *
   * Dedup en dos niveles independientes:
   * - El **aviso WS** (toast/campana) se emite una sola vez por escala: solo
   *   para las escalas con `llegadaNotificadaEn IS NULL`, que luego se sellan.
   * - El **email a contactos** se controla por contacto (`notificadoEn`), así
   *   que un contacto agregado DESPUÉS de la primera llegada también recibe el
   *   aviso mientras el conductor siga dentro del radio (por eso se consideran
   *   TODAS las escalas cercanas, no solo las nuevas).
   */
  private async evaluarGeocercas(
    viajeId: string,
    puntos: UbicacionPublica[],
  ): Promise<void> {
    const lats = puntos.map((p) => p.lat);
    const lngs = puntos.map((p) => p.lng);

    // Todas las escalas dentro del radio (con su sello de llegada, para separar
    // las nuevas de las ya notificadas).
    const cercanas = await this.prisma.$queryRaw<EscalaCercana[]>`
      SELECT DISTINCT e."id", e."orden", e."accion", e."direccion",
             e."llegadaNotificadaEn"
      FROM "escalas_viaje" e
      WHERE e."viajeId" = ${viajeId}
        AND e."ubicacion" IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(${lats}::float8[], ${lngs}::float8[]) AS p(lat, lng)
          WHERE ST_DWithin(
            e."ubicacion",
            ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
            ${RADIO_GEOCERCA_METROS}
          )
        )
      ORDER BY e."orden"
    `;

    if (cercanas.length === 0) return;

    const nuevas = cercanas.filter((e) => e.llegadaNotificadaEn == null);

    // Folio del viaje (para el aviso y el email) + orden del destino (última
    // escala) para distinguir "llegó al destino" de una parada intermedia.
    const [meta, maxOrden] = await Promise.all([
      this.prisma.viaje.findUnique({
        where: { id: viajeId },
        select: { folio: true },
      }),
      this.prisma.escalaViaje.aggregate({
        where: { viajeId },
        _max: { orden: true },
      }),
    ]);
    const folio = meta?.folio ?? null;
    const ordenDestino = maxOrden._max.orden;

    if (nuevas.length > 0) {
      // Sella las nuevas para no reemitir el aviso WS en lotes posteriores.
      await this.prisma.escalaViaje.updateMany({
        where: { id: { in: nuevas.map((e) => e.id) } },
        data: { llegadaNotificadaEn: new Date() },
      });

      for (const escala of nuevas) {
        this.gateway.emitirAlerta(viajeId, {
          tipo: 'llegada_escala',
          viajeId,
          folio,
          escalaOrden: escala.orden,
          escalaAccion: escala.accion,
          escalaDireccion: escala.direccion,
          esDestino: ordenDestino != null && escala.orden === ordenDestino,
          detectadoEn: new Date().toISOString(),
        });
      }
    }

    // Email a los contactos de TODAS las escalas cercanas (dedup por contacto):
    // best-effort y fuera del camino de respuesta para no bloquear la ingesta de
    // GPS con la latencia del SMTP. El aviso WS ya se emitió arriba.
    void this.notificarContactos(
      viajeId,
      cercanas.map((e) => e.id),
      folio,
    ).catch((e) =>
      this.logger.error(
        `Error al notificar contactos de llegada (viaje ${viajeId}): ${(e as Error).message}`,
      ),
    );
  }

  /**
   * Envía el aviso de llegada por email a las personas a cargo de las escalas
   * indicadas (las que tienen email y aún no fueron notificadas). Best-effort:
   * EmailService nunca propaga errores; aquí solo se registra y se sella
   * `notificadoEn` para dejar constancia y no reenviar.
   */
  private async notificarContactos(
    viajeId: string,
    escalaIds: string[],
    folio: number | null,
  ): Promise<void> {
    const contactos = await this.prisma.contactoEscala.findMany({
      where: {
        escalaId: { in: escalaIds },
        email: { not: null },
        notificadoEn: null,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        escala: { select: { direccion: true } },
      },
    });
    if (contactos.length === 0) return;

    for (const c of contactos) {
      const direccion = c.escala.direccion;
      const mencionViaje = folio != null ? ` del viaje #${folio}` : '';
      const subject = `El transportista llegó a ${direccion}${
        folio != null ? ` (viaje #${folio})` : ''
      }`;
      const saludo = c.nombre ? `Hola ${c.nombre}:` : 'Hola:';
      const text =
        `${saludo}\n\n` +
        `Te avisamos que el transportista${mencionViaje} acaba de llegar a:\n` +
        `${direccion}.\n\n` +
        `Este es un aviso automático de FlotaOS.`;
      // El HTML interpola texto libre del usuario (nombre/dirección): escapar
      // entidades para evitar inyección de markup en el correo.
      const saludoHtml = c.nombre ? `Hola ${escaparHtml(c.nombre)}:` : 'Hola:';
      const html =
        `<p>${saludoHtml}</p>` +
        `<p>Te avisamos que el transportista${mencionViaje} acaba de llegar a:` +
        `<br><strong>${escaparHtml(direccion)}</strong>.</p>` +
        `<p style="color:#666;font-size:12px">Este es un aviso automático de FlotaOS.</p>`;

      const ok = await this.email.enviar({
        to: c.email as string,
        subject,
        text,
        html,
      });
      if (!ok) {
        this.logger.warn(
          `No se pudo enviar el aviso de llegada a ${c.email} (escala "${direccion}")`,
        );
      }
    }

    // Sella los contactos como notificados (constancia + dedup por contacto).
    await this.prisma.contactoEscala.updateMany({
      where: { id: { in: contactos.map((c) => c.id) } },
      data: { notificadoEn: new Date() },
    });
  }
}
