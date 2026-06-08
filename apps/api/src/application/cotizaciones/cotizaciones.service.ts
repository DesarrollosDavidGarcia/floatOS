import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

const dec = (v: Prisma.Decimal | null): number => (v == null ? 0 : Number(v));

/**
 * Servicio de cotizaciones: ejecuta el motor de cálculo y persiste/consulta las
 * cotizaciones de un viaje. La lógica de precio es pura (domain/cotizacion).
 */
@Injectable()
export class CotizacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
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

    const datos: DatosCotizacionPdf = {
      emisor: {
        nombre: process.env.EMPRESA_NOMBRE || 'Transportista',
        rfc: process.env.EMPRESA_RFC || undefined,
        direccion: process.env.EMPRESA_DIRECCION || undefined,
        telefono: process.env.EMPRESA_TELEFONO || undefined,
        email: process.env.EMPRESA_EMAIL || undefined,
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
   * Envía la cotización por correo (PDF adjunto) vía EmailService (Brevo/SMTP).
   * Destinatarios: la lista `to`, o el correo de contacto del cliente si va vacía.
   * Marca ENVIADA si sale.
   */
  async enviar(id: string, to?: string[]) {
    const info = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: {
        folio: true,
        viaje: { select: { cliente: { select: { contactoEmail: true } } } },
      },
    });
    if (!info) throw new NotFoundException(`Cotización con id ${id} no encontrada`);

    const capturados = [...new Set((to ?? []).map((s) => s.trim()).filter(Boolean))];
    const fallbackCliente = info.viaje.cliente?.contactoEmail;
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

    const { buffer, folio } = await this.generarPdf(id);
    const empresa = process.env.EMPRESA_NOMBRE || 'Transportista';
    const subject = `Cotización #${folio} — ${empresa}`;
    const text = `Hola,\n\nAdjuntamos la cotización #${folio} para su revisión.\n\nSaludos,\n${empresa}`;
    const html =
      `<p>Hola,</p><p>Adjuntamos la <strong>cotización #${folio}</strong> para su revisión.</p>` +
      `<p>Saludos,<br/>${empresa}</p>`;

    const enviado = await this.email.enviar({
      to: destinatarios,
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

    return this.prisma.cotizacion.update({
      where: { id },
      data: { estado: 'ENVIADA', enviadaEn: new Date() },
    });
  }
}
