import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GeocodingService } from '../../../infrastructure/routing/geocoding.service';
import { RouteService } from '../../../infrastructure/routing/route.service';
import {
  cotizar,
  r2,
  TARIFAS_DEFECTO,
  type ParamsCotizacion,
  type ResultadoCotizacion,
} from '../../../domain/cotizacion/motor-cotizacion';

/** Claves numéricas de ParamsCotizacion (para saneo del JSON de empresa). */
const CLAVES_NUMERICAS: Array<keyof ParamsCotizacion> = [
  'tarifaBase',
  'precioPorKm',
  'precioPorKg',
  'precioDiesel',
  'rendimientoKmL',
  'casetas',
  'maniobrasPorEscala',
  'margenPct',
];

/**
 * Lógica de negocio del bot de cotización: geocodificación + ruteo + motor de
 * cotización y armado del resumen para WhatsApp. Vive fuera del controller para
 * mantener la capa de presentación delgada y poder testear el cálculo aislado.
 */
@Injectable()
export class BotCotizacionService {
  private readonly logger = new Logger(BotCotizacionService.name);

  constructor(
    private readonly geocoding: GeocodingService,
    private readonly rutas: RouteService,
    private readonly prisma: PrismaService,
  ) {}

  /** Distancia por carretera (km) + ETA entre dos direcciones de texto. */
  async distancia(origen: string, destino: string) {
    const [o, d] = await Promise.all([
      this.geocoding.geocodificar(origen),
      this.geocoding.geocodificar(destino),
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
  async cotizacion(input: {
    origen: string;
    destino: string;
    pesoKg: number;
    numEscalas?: number;
  }) {
    const [o, d] = await Promise.all([
      this.geocoding.geocodificar(input.origen),
      this.geocoding.geocodificar(input.destino),
    ]);
    const ruta = await this.rutas.calcular([
      { lat: o.lat, lng: o.lng },
      { lat: d.lat, lng: d.lng },
    ]);
    const distanciaKm = r2(ruta.km);
    const numEscalas = input.numEscalas ?? 0;
    const params = await this.cargarTarifas();
    const resultado = cotizar(params, {
      distanciaKm,
      pesoKg: input.pesoKg,
      numEscalas,
    });

    return {
      origen: o.direccionFormateada,
      destino: d.direccionFormateada,
      distanciaKm,
      tiempoMin: ruta.tiempoMin,
      pesoKg: input.pesoKg,
      numEscalas,
      moneda: 'MXN',
      total: resultado.total,
      resultado,
      // Texto listo para que el bot lo mande por WhatsApp/zavu tal cual.
      resumen: this.resumen(
        o.direccionFormateada,
        d.direccionFormateada,
        distanciaKm,
        input.pesoKg,
        resultado,
      ),
    };
  }

  /** Carga las tarifas: config de empresa por encima de los defaults del código. */
  async cargarTarifas(): Promise<ParamsCotizacion> {
    const empresa = await this.prisma.empresa.findFirst().catch((e: Error) => {
      // Degradación a defaults aceptable para el bot, pero dejamos rastro.
      this.logger.warn(`No se pudo leer tarifas de empresa: ${e.message}`);
      return null;
    });
    return { ...TARIFAS_DEFECTO, ...this.sanearTarifas(empresa?.tarifasCotizacion) };
  }

  /**
   * Filtra el JSON de tarifas de la empresa a las claves conocidas con valores
   * numéricos/booleanos válidos, para no inyectar basura de BD al motor.
   */
  private sanearTarifas(raw: unknown): Partial<ParamsCotizacion> {
    if (!raw || typeof raw !== 'object') return {};
    const o = raw as Record<string, unknown>;
    const limpio: Record<string, number | boolean> = {};
    for (const k of CLAVES_NUMERICAS) {
      const v = o[k];
      if (typeof v === 'number' && Number.isFinite(v)) limpio[k] = v;
    }
    if (typeof o.aplicaIva === 'boolean') limpio.aplicaIva = o.aplicaIva;
    if (typeof o.aplicaRetencion === 'boolean')
      limpio.aplicaRetencion = o.aplicaRetencion;
    return limpio as Partial<ParamsCotizacion>;
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
