import { Module } from '@nestjs/common';
import { ViajesController } from './viajes.controller';
import { ViajesService } from '../../../application/viajes/viajes.service';
import { CrearViajeUseCase } from '../../../application/viajes/crear-viaje.usecase';
import { DuplicarViajeUseCase } from '../../../application/viajes/duplicar-viaje.usecase';
import { ListarViajesUseCase } from '../../../application/viajes/listar-viajes.usecase';
import { ObtenerViajeUseCase } from '../../../application/viajes/obtener-viaje.usecase';
import { EditarViajeUseCase } from '../../../application/viajes/editar-viaje.usecase';
import { AsignarViajeUseCase } from '../../../application/viajes/asignar-viaje.usecase';
import { CambiarEstadoViajeUseCase } from '../../../application/viajes/cambiar-estado-viaje.usecase';
import { ActualizarPlanRutaUseCase } from '../../../application/viajes/actualizar-plan-ruta.usecase';
import { MotorViajeService } from '../../../application/viajes/motor-viaje.service';
import { RoutingModule } from '../../../infrastructure/routing/routing.module';
import { TrackingModule } from '../../ws/tracking/tracking.module';

/**
 * Módulo Viajes (aggregate root Viaje + HistorialEstadoViaje).
 * PrismaModule es @Global, por lo que no se importa aquí.
 * Importa TrackingModule para inyectar TrackingGateway (emisión de cambios de
 * estado en tiempo real); no hay ciclo porque tracking no depende de viajes.
 * Exporta ViajesService para que el módulo de tracking pueda inyectarlo.
 */
@Module({
  imports: [TrackingModule, RoutingModule],
  controllers: [ViajesController],
  providers: [
    ViajesService,
    MotorViajeService,
    CrearViajeUseCase,
    DuplicarViajeUseCase,
    ListarViajesUseCase,
    ObtenerViajeUseCase,
    EditarViajeUseCase,
    AsignarViajeUseCase,
    CambiarEstadoViajeUseCase,
    ActualizarPlanRutaUseCase,
  ],
  exports: [ViajesService],
})
export class ViajesModule {}
