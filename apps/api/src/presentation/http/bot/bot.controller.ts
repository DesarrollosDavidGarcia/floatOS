import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GeocodingService } from '../../../infrastructure/routing/geocoding.service';
import { RouteService } from '../../../infrastructure/routing/route.service';
import {
  cotizar,
  type ParamsCotizacion,
  type ResultadoCotizacion,
} from '../../../domain/cotizacion/motor-cotizacion';
import { CotizarBotDto, DistanciaBotDto } from './dto/cotizar-bot.dto';

const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Tarifas por defecto si la empresa no las ha configurado. Son placeholders
 * razonables; las reales se ponen en la config de empresa (campo
 * `tarifasCotizacion`) y tienen prioridad.
 */
const TARIFAS_DEFECTO: ParamsCotizacion = {
  tarifaBase: 1500,
  precioPorKm: 25,
  precioPorKg: 0,
  precioDiesel: 24,
  rendimientoKmL: 2.5,
  casetas: 0,
  maniobrasPorEscala: 500,
  margenPct: 20,
  aplicaIva: true,
  aplicaRetencion: false,
};

/**
 * Superficie para clientes de servicio (bot de cotización en n8n). Autenticada
 * por API key (`X-Api-Key`), NO por el JWT del panel. Encapsula geocodificación
 * + ruteo + motor de cotización para que el bot haga UNA sola llamada.
 */
@Controller('bot')
@UseGuards(ApiKeyGuard)
export class BotController {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly rutas: RouteService,
    private readonly prisma: PrismaService,
  ) {}

  /** Tarifas por defecto vigentes (config de empresa + fallback). */
  @Get('tarifas')
  async tarifas(): Promise<ParamsCotizacion> {
    return this.cargarTarifas();
  }

  /** Distancia por carretera (km) entre dos direcciones de texto. */
  @Post('ruta/distancia')
  async distancia(@Body() dto: DistanciaBotDto) {
    const [o, d] = await Promise.all([
      this.geocoding.geocodificar(dto.origen),
      this.geocoding.geocodificar(dto.destino),
    ]);
    const ruta = await this.rutas.calcular([
      { lat: o.lat, lng: o.lng },
      { lat: d.lat, lng: d.lng },
    ]);
    return {
      origen: o.direccionFormateada,
      destino: d.direccionFormateada,
      distanciaKm: r2(ruta.km),
      tiempoMin: ruta.tiempoMin,
      metodo: ruta.metodo,
    };
  }

  /** Cotización completa: geocodifica, rutea, aplica tarifas y calcula. */
  @Post('cotizacion')
  async cotizacion(@Body() dto: CotizarBotDto) {
    const [o, d] = await Promise.all([
      this.geocoding.geocodificar(dto.origen),
      this.geocoding.geocodificar(dto.destino),
    ]);
    const ruta = await this.rutas.calcular([
      { lat: o.lat, lng: o.lng },
      { lat: d.lat, lng: d.lng },
    ]);
    const distanciaKm = r2(ruta.km);
    const numEscalas = dto.numEscalas ?? 0;
    const params = await this.cargarTarifas();
    const resultado = cotizar(params, {
      distanciaKm,
      pesoKg: dto.pesoKg,
      numEscalas,
    });

    return {
      origen: o.direccionFormateada,
      destino: d.direccionFormateada,
      distanciaKm,
      tiempoMin: ruta.tiempoMin,
      pesoKg: dto.pesoKg,
      numEscalas,
      moneda: 'MXN',
      total: resultado.total,
      resultado,
      // Texto listo para que el bot lo mande por WhatsApp/zavu tal cual.
      resumen: this.resumen(
        o.direccionFormateada,
        d.direccionFormateada,
        distanciaKm,
        dto.pesoKg,
        resultado,
      ),
    };
  }

  /** Carga las tarifas: config de empresa por encima de los defaults del código. */
  private async cargarTarifas(): Promise<ParamsCotizacion> {
    const empresa = await this.prisma.empresa.findFirst().catch(() => null);
    const guardadas = (empresa?.tarifasCotizacion ??
      {}) as unknown as Partial<ParamsCotizacion>;
    return { ...TARIFAS_DEFECTO, ...guardadas };
  }

  private resumen(
    origen: string,
    destino: string,
    km: number,
    kg: number,
    r: ResultadoCotizacion,
  ): string {
    const dinero = (n: number) =>
      `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return [
      `🚚 Cotización ${origen} → ${destino}`,
      `Distancia ≈ ${km.toLocaleString('es-MX')} km · Peso ${kg.toLocaleString('es-MX')} kg`,
      `Subtotal: ${dinero(r.subtotal)}${r.iva ? ` · IVA: ${dinero(r.iva)}` : ''}${r.retencion ? ` · Ret.: -${dinero(r.retencion)}` : ''}`,
      `Total: ${dinero(r.total)} MXN`,
    ].join('\n');
  }
}
