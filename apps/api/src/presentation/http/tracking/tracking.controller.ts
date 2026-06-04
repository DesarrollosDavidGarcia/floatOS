import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ObtenerSeguimientoPublicoUseCase } from '../../../application/tracking/obtener-seguimiento-publico.usecase';
import { SeguimientoPublico } from '../../../application/tracking/tracking.types';

/**
 * Link público de seguimiento para el cliente final. SIN autenticación.
 * Al ser público y sin login, se limita a 60 req/min por IP para frenar la
 * enumeración de tokens de seguimiento.
 */
@Controller('tracking')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
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
