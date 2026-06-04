import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EscaneoVencimientosService } from '../../../application/alertas/escaneo-vencimientos.service';
import { AlertaVencimiento } from '../../../application/alertas/alertas.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DiasVencimientoDto } from '../shared/dias-vencimiento.dto';

/**
 * Centro de alertas (dashboard). Calcula on-demand (sin cola) los documentos
 * por vencer dentro de N días.
 *
 * Es un módulo administrativo: requiere autenticación y rol admin.
 */
@Controller('alertas')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AlertasController {
  constructor(private readonly escaneo: EscaneoVencimientosService) {}

  /**
   * GET /alertas/vencimientos?dias=30
   * Lista combinada (unidades + conductores) ordenada por fechaVencimiento asc.
   */
  @Get('vencimientos')
  listarVencimientos(
    @Query() query: DiasVencimientoDto,
  ): Promise<AlertaVencimiento[]> {
    return this.escaneo.listarPorVencer(query.dias);
  }
}
