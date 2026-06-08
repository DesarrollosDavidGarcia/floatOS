import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CotizacionesService } from '../../../application/cotizaciones/cotizaciones.service';
import {
  CalcularCotizacionDto,
  CrearCotizacionDto,
  EnviarCotizacionDto,
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

  /** Envía la cotización por correo con el PDF adjunto (Brevo/SMTP). */
  @Post('cotizaciones/:id/enviar')
  enviar(@Param('id') id: string, @Body() dto: EnviarCotizacionDto) {
    return this.cotizaciones.enviar(id, dto.to);
  }

  /** Descarga el PDF de la cotización. */
  @Get('cotizaciones/:id/pdf')
  async pdf(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, folio } = await this.cotizaciones.generarPdf(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="cotizacion-${folio}.pdf"`,
    });
  }
}
