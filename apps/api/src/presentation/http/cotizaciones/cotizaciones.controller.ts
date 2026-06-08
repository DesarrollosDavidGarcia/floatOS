import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CotizacionesService } from '../../../application/cotizaciones/cotizaciones.service';
import {
  CalcularCotizacionDto,
  CrearCotizacionDto,
} from './dto/cotizacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller()
@UseGuards(JwtAuthGuard, AdminGuard)
export class CotizacionesController {
  constructor(private readonly cotizaciones: CotizacionesService) {}

  /** Previsualización del motor de cotización (no persiste). */
  @Post('cotizaciones/calcular')
  calcular(@Body() dto: CalcularCotizacionDto) {
    return this.cotizaciones.calcular(dto.params, dto.datos);
  }

  /** Crea una cotización para un viaje (datos del viaje + params capturados). */
  @Post('viajes/:viajeId/cotizaciones')
  crear(@Param('viajeId') viajeId: string, @Body() dto: CrearCotizacionDto) {
    return this.cotizaciones.crear(viajeId, dto.params, dto.notas);
  }

  /** Lista las cotizaciones de un viaje. */
  @Get('viajes/:viajeId/cotizaciones')
  listar(@Param('viajeId') viajeId: string) {
    return this.cotizaciones.listarPorViaje(viajeId);
  }

  /** Detalle de una cotización. */
  @Get('cotizaciones/:id')
  obtener(@Param('id') id: string) {
    return this.cotizaciones.obtener(id);
  }
}
