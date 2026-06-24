import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EstadoCotizacion, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import {
  cotizar,
  type DatosCotizacion,
  type LineaCotizacion,
  type ParamsCotizacion,
} from '../../domain/cotizacion/motor-cotizacion';
import {
  generarCotizacionPdf,
  type DatosCotizacionPdf,
} from '../../infrastructure/pdf/cotizacion-pdf';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';

const dec = (v: Prisma.Decimal | null): number => (v == null ? 0 : Number(v));

/** Opciones de envío de una cotización (destinatarios/asunto/mensaje). */
export interface OpcionesEnvioCotizacion {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  mensaje?: string;
}

/** Escapa el texto del usuario antes de interpolarlo en el HTML del correo. */
const escaparHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Transiciones válidas del estado de una cotización. BORRADOR sale vía `enviar`
 * (a ENVIADA) o se marca decidido manualmente; una vez decidida se puede cambiar
 * la decisión o reabrir a ENVIADA. No hay vuelta a BORRADOR (no se "des-envía").
 */
const TRANSICIONES_COTIZACION: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  [EstadoCotizacion.BORRADOR]: [
    EstadoCotizacion.ENVIADA,
    EstadoCotizacion.ACEPTADA,
    EstadoCotizacion.RECHAZADA,
  ],
  [EstadoCotizacion.ENVIADA]: [
    EstadoCotizacion.ACEPTADA,
    EstadoCotizacion.RECHAZADA,
  ],
  [EstadoCotizacion.ACEPTADA]: [
    EstadoCotizacion.RECHAZADA,
    EstadoCotizacion.ENVIADA,
  ],
  [EstadoCotizacion.RECHAZADA]: [
    EstadoCotizacion.ACEPTADA,
    EstadoCotizacion.ENVIADA,
  ],
};

/**
 * Servicio de cotizaciones: ejecuta el motor de cálculo y persiste/consulta las
 * cotizaciones de un viaje. La lógica de precio es pura (domain/cotizacion).
 */
@Injectable()
export class CotizacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly tracking: TrackingGateway,
  ) {}

  /** Previsualización (no persiste): corre el motor con params + datos dados. */
  calcular(params: ParamsCotizacion, datos: DatosCotizacion) {
    return cotizar(params, datos);
  }

  /** Carga y mapea los datos (km/kg/escalas) del viaje para el motor. */
  private async datosViaje(viajeId: string): Promise<DatosCotizacion> {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: {
        distanciaEstimadaKm: true,
        pesoMaxKg: true,
        pesoKg: true,
        _count: { select: { escalas: true } },
      },
    });
    if (!viaje) {
      throw new NotFoundException(`Viaje con id ${viajeId} no encontrado`);
    }
    return {
      distanciaKm: dec(viaje.distanciaEstimadaKm),
      // Mismo criterio que el preview del diálogo (`??`): usa pesoMaxKg si existe
      // —incluido 0—, si no el pesoKg. Evita que preview y guardado difieran.
      pesoKg: viaje.pesoMaxKg != null ? Number(viaje.pesoMaxKg) : dec(viaje.pesoKg),
      numEscalas: viaje._count.escalas,
    };
  }

  /** Campos snapshot (params + datos + desglose + totales) para create/update. */
  private snapshot(
    params: ParamsCotizacion,
    datos: DatosCotizacion,
    notas?: string,
  ) {
    const r = cotizar(params, datos);
    return {
      params: params as unknown as Prisma.InputJsonValue,
      distanciaKm: datos.distanciaKm,
      pesoKg: datos.pesoKg,
      numEscalas: datos.numEscalas,
      desglose: {
        lineas: r.lineas,
        subtotalConceptos: r.subtotalConceptos,
        margen: r.margen,
      } as unknown as Prisma.InputJsonValue,
      subtotal: r.subtotal,
      iva: r.iva,
      retencion: r.retencion,
      total: r.total,
      notas: notas ?? null,
    };
  }

  /** Crea una cotización tomando los datos (km/kg/escalas) del viaje. */
  async crear(viajeId: string, params: ParamsCotizacion, notas?: string) {
    const datos = await this.datosViaje(viajeId);
    return this.prisma.cotizacion.create({
      data: {
        viaje: { connect: { id: viajeId } },
        ...this.snapshot(params, datos, notas),
      },
    });
  }

  /** Edita una cotización SOLO si está en BORRADOR; recalcula con datos del viaje. */
  async editar(id: string, params: ParamsCotizacion, notas?: string) {
    const cot = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: { estado: true, viajeId: true },
    });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);
    if (cot.estado !== 'BORRADOR') {
      throw new ConflictException(
        `Solo se pueden editar cotizaciones en borrador (estado actual: ${cot.estado}).`,
      );
    }
    const datos = await this.datosViaje(cot.viajeId);
    return this.prisma.cotizacion.update({
      where: { id },
      data: this.snapshot(params, datos, notas),
    });
  }

  /** Lista las cotizaciones de un viaje (más reciente primero). */
  listarPorViaje(viajeId: string) {
    return this.prisma.cotizacion.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obtener(id: string) {
    const cot = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);
    return cot;
  }

  /**
   * Cambia el estado de la cotización validando contra `TRANSICIONES_COTIZACION`.
   * Al pasar a ENVIADA por primera vez sella `enviadaEn` (marcado manual sin correo).
   */
  async cambiarEstado(id: string, estado: EstadoCotizacion) {
    const cot = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: { estado: true, enviadaEn: true },
    });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);
    if (cot.estado === estado) return this.obtener(id);
    if (!TRANSICIONES_COTIZACION[cot.estado].includes(estado)) {
      throw new ConflictException(
        `Transición inválida: ${cot.estado} → ${estado}.`,
      );
    }
    return this.prisma.cotizacion.update({
      where: { id },
      data: {
        estado,
        ...(estado === EstadoCotizacion.ENVIADA && !cot.enviadaEn
          ? { enviadaEn: new Date() }
          : {}),
      },
    });
  }

  /** Elimina una cotización SOLO si está en BORRADOR (si no, 409). */
  async eliminar(id: string) {
    const cot = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);
    if (cot.estado !== EstadoCotizacion.BORRADOR) {
      throw new ConflictException(
        `Solo se pueden eliminar cotizaciones en borrador (estado actual: ${cot.estado}).`,
      );
    }
    await this.prisma.cotizacion.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Duplica una cotización (de cualquier estado) en un nuevo BORRADOR del mismo
   * viaje, recalculando con los datos actuales del viaje (reusa `crear`).
   */
  async duplicar(id: string) {
    const cot = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: { viajeId: true, params: true, notas: true },
    });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);
    return this.crear(
      cot.viajeId,
      cot.params as unknown as ParamsCotizacion,
      cot.notas ?? undefined,
    );
  }

  /** Genera el PDF de una cotización (datos del emisor por env, por instancia). */
  async generarPdf(id: string): Promise<{ buffer: Buffer; folio: number }> {
    const cot = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        viaje: {
          select: {
            folio: true,
            origenDireccion: true,
            destinoDireccion: true,
            cliente: { select: { razonSocial: true, rfc: true } },
          },
        },
      },
    });
    if (!cot) throw new NotFoundException(`Cotización con id ${id} no encontrada`);

    const desglose = cot.desglose as unknown as {
      lineas: LineaCotizacion[];
      subtotalConceptos: number;
      margen: number;
    };

    // Emisor: se toma de la configuración de empresa (Mi Empresa); si está
    // vacía, cae a las variables de entorno EMPRESA_* (legado).
    const empresa = await this.prisma.empresa.findFirst();
    const domicilio = empresa
      ? [
          [empresa.calle, empresa.numeroExt].filter(Boolean).join(' '),
          empresa.colonia,
          empresa.cp,
          [empresa.municipio, empresa.estado].filter(Boolean).join(', '),
        ]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join(', ')
      : '';

    const datos: DatosCotizacionPdf = {
      emisor: {
        nombre: empresa?.razonSocial || process.env.EMPRESA_NOMBRE || 'Transportista',
        rfc: empresa?.rfc || process.env.EMPRESA_RFC || undefined,
        direccion: domicilio || process.env.EMPRESA_DIRECCION || undefined,
        telefono: empresa?.telefono || process.env.EMPRESA_TELEFONO || undefined,
        email: empresa?.email || process.env.EMPRESA_EMAIL || undefined,
      },
      cliente: {
        razonSocial: cot.viaje.cliente?.razonSocial ?? 'Cliente',
        rfc: cot.viaje.cliente?.rfc,
      },
      viaje: {
        folio: cot.viaje.folio,
        origen: cot.viaje.origenDireccion,
        destino: cot.viaje.destinoDireccion,
        distanciaKm: dec(cot.distanciaKm),
        pesoKg: dec(cot.pesoKg),
        numEscalas: cot.numEscalas,
      },
      cotizacion: {
        folio: cot.folio,
        fecha: cot.createdAt,
        moneda: cot.moneda,
        lineas: desglose.lineas ?? [],
        subtotalConceptos: desglose.subtotalConceptos ?? 0,
        margen: desglose.margen ?? 0,
        subtotal: dec(cot.subtotal),
        iva: dec(cot.iva),
        retencion: dec(cot.retencion),
        total: dec(cot.total),
        notas: cot.notas,
      },
    };

    const buffer = await generarCotizacionPdf(datos);
    return { buffer, folio: cot.folio };
  }

  /**
   * Procesa el envío completo de una cotización: genera el PDF, resuelve los
   * destinatarios, manda el correo (Brevo/SMTP), marca la cotización como ENVIADA
   * y emite el evento WS `cotizacion:actualizada` para que el panel refresque.
   *
   * ÚNICO sitio con la lógica de envío. Se invoca desde el worker BullMQ
   * (`CotizacionesWorker`) o, como fallback síncrono, desde el flujo HTTP cuando
   * la cola no está disponible (Redis caído): así el envío NUNCA se pierde.
   *
   * Lanza si no hay destinatario (BadRequest) o si el proveedor de correo falla
   * (ServiceUnavailable); en el worker eso provoca el reintento de BullMQ.
   */
  async procesarEnvio(
    id: string,
    opts: OpcionesEnvioCotizacion = {},
  ): Promise<void> {
    const info = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: {
        folio: true,
        viajeId: true,
        viaje: {
          select: {
            cliente: {
              select: {
                contactos: {
                  orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }],
                  take: 1,
                  select: { email: true },
                },
              },
            },
          },
        },
      },
    });
    if (!info) throw new NotFoundException(`Cotización con id ${id} no encontrada`);

    const limpiar = (xs?: string[]) =>
      [...new Set((xs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean))];

    const capturados = limpiar(opts.to);
    const fallbackCliente = info.viaje.cliente?.contactos?.[0]?.email;
    const destinatarios = capturados.length
      ? capturados
      : fallbackCliente
        ? [fallbackCliente]
        : [];
    if (!destinatarios.length) {
      throw new BadRequestException(
        'No hay correo destino: captura al menos uno o registra el correo de contacto del cliente.',
      );
    }
    // cc/bcc sin solaparse con los destinatarios (evita duplicar el envío).
    const enTo = new Set(destinatarios);
    const cc = limpiar(opts.cc).filter((e) => !enTo.has(e));
    const enCc = new Set(cc);
    const bcc = limpiar(opts.bcc).filter((e) => !enTo.has(e) && !enCc.has(e));

    const { buffer, folio } = await this.generarPdf(id);
    const empresaCfg = await this.prisma.empresa.findFirst();
    const empresa =
      empresaCfg?.razonSocial || process.env.EMPRESA_NOMBRE || 'Transportista';
    const subject = opts.subject?.trim() || `Cotización #${folio} — ${empresa}`;
    const cuerpo = opts.mensaje?.trim();
    const text =
      cuerpo ||
      `Hola,\n\nAdjuntamos la cotización #${folio} para su revisión.\n\nSaludos,\n${empresa}`;
    // Mensaje personalizado: respeta saltos de línea como párrafos/<br/> en HTML.
    const html = cuerpo
      ? `<p>${escaparHtml(cuerpo).replace(/\n/g, '<br/>')}</p>`
      : `<p>Hola,</p><p>Adjuntamos la <strong>cotización #${folio}</strong> para su revisión.</p>` +
        `<p>Saludos,<br/>${empresa}</p>`;

    const enviado = await this.email.enviar({
      to: destinatarios,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `cotizacion-${folio}.pdf`,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!enviado) {
      throw new ServiceUnavailableException(
        `No se pudo enviar el correo (proveedor: ${this.email.proveedorActivo()}). Configura Brevo (BREVO_API_KEY) o SMTP.`,
      );
    }

    const actualizada = await this.prisma.cotizacion.update({
      where: { id },
      data: { estado: 'ENVIADA', enviadaEn: new Date() },
      select: { id: true, viajeId: true, estado: true },
    });

    // Avisa al panel (sala admin) para que refresque el listado de cotizaciones
    // del viaje sin tener que esperar al refetch perezoso.
    this.tracking.emitirCotizacionActualizada({
      cotizacionId: actualizada.id,
      viajeId: actualizada.viajeId,
      estado: actualizada.estado,
    });
  }
}
