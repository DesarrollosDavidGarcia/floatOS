import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TrackingGateway } from './tracking.gateway';
import { UbicacionController } from '../../http/tracking/ubicacion.controller';
import { TrackingController } from '../../http/tracking/tracking.controller';
import { RegistrarUbicacionUseCase } from '../../../application/tracking/registrar-ubicacion.usecase';
import { ObtenerSeguimientoPublicoUseCase } from '../../../application/tracking/obtener-seguimiento-publico.usecase';

/**
 * Módulo de seguimiento en tiempo real (tracking).
 * Expone el gateway Socket.io, la ingesta de ubicaciones del conductor y el
 * link público de seguimiento. Exporta el gateway para que otros módulos
 * (p. ej. viajes) puedan emitir cambios de estado a las salas.
 */
@Module({
  // La configuración de verificación se pasa por operación en el gateway.
  imports: [JwtModule.register({})],
  controllers: [UbicacionController, TrackingController],
  providers: [
    TrackingGateway,
    RegistrarUbicacionUseCase,
    ObtenerSeguimientoPublicoUseCase,
  ],
  exports: [TrackingGateway],
})
export class TrackingModule {}
