import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BotCotizacionService } from './bot-cotizacion.service';
import type { ParamsCotizacion } from '../../../domain/cotizacion/motor-cotizacion';
import { CotizarBotDto, DistanciaBotDto } from './dto/cotizar-bot.dto';

/**
 * Superficie para clientes de servicio (bot de cotización en n8n). Autenticada
 * por API key (`X-Api-Key`), NO por el JWT del panel. Encapsula geocodificación
 * + ruteo + motor de cotización para que el bot haga UNA sola llamada.
 *
 * `@Throttle` propio (más estricto que el global): n8n llama desde una sola IP,
 * así que un tope bajo no molesta el uso legítimo y acota fuerza bruta de la key
 * y abuso de las llamadas externas (geocoding/ruteo se facturan).
 */
@Controller('bot')
@UseGuards(ApiKeyGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class BotController {
  constructor(private readonly cotizaciones: BotCotizacionService) {}

  /** Tarifas por defecto vigentes (config de empresa + fallback). */
  @Get('tarifas')
  async tarifas(): Promise<ParamsCotizacion> {
    return this.cotizaciones.cargarTarifas();
  }

  /** Distancia por carretera (km) entre dos direcciones de texto. */
  @Post('ruta/distancia')
  async distancia(@Body() dto: DistanciaBotDto) {
    return this.cotizaciones.distancia(dto.origen, dto.destino);
  }

  /** Cotización completa: geocodifica, rutea, aplica tarifas y calcula. */
  @Post('cotizacion')
  async cotizacion(@Body() dto: CotizarBotDto) {
    return this.cotizaciones.cotizacion(dto);
  }
}
