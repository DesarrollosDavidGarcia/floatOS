import { Controller, Get, Param } from '@nestjs/common';
import { ObtenerSeguimientoPublicoUseCase } from '../../../application/tracking/obtener-seguimiento-publico.usecase';
import { SeguimientoPublico } from '../../../application/tracking/tracking.types';

/**
 * Link público de seguimiento para el cliente final. SIN autenticación.
 */
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly obtenerSeguimiento: ObtenerSeguimientoPublicoUseCase,
  ) {}

  /** Devuelve los datos públicos del viaje asociado al token de seguimiento. */
  @Get(':token')
  obtener(@Param('token') token: string): Promise<SeguimientoPublico> {
    return this.obtenerSeguimiento.execute(token);
  }
}
