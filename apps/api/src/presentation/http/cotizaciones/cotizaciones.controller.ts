import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CotizacionesService } from '../../../application/cotizaciones/cotizaciones.service';
import {
  CalcularCotizacionDto,
  CambiarEstadoCotizacionDto,
  CrearCotizacionDto,
  EnviarCotizacionDto,
} from './dto/cotizacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
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

  /** Edita una cotización (solo si está en borrador). */
  @Patch('cotizaciones/:id')
  editar(@Param('id') id: string, @Body() dto: CrearCotizacionDto) {
    return this.cotizaciones.editar(id, dto.params, dto.notas);
  }

  /** Cambia el estado de una cotización (Aceptada/Rechazada/reabrir a Enviada). */
  @Patch('cotizaciones/:id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoCotizacionDto,
  ) {
    return this.cotizaciones.cambiarEstado(id, dto.estado);
  }

  /** Duplica una cotización en un nuevo borrador del mismo viaje. */
  @Post('cotizaciones/:id/duplicar')
  duplicar(@Param('id') id: string) {
    return this.cotizaciones.duplicar(id);
  }

  /** Elimina una cotización (solo si está en borrador). */
  @Delete('cotizaciones/:id')
  eliminar(@Param('id') id: string) {
    return this.cotizaciones.eliminar(id);
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
    return this.cotizaciones.enviar(id, dto);
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
