import { Module } from '@nestjs/common';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from '../../../application/cotizaciones/cotizaciones.service';

/**
 * Módulo de Cotizaciones (motor de cálculo + persistencia por viaje).
 * PrismaModule es @Global, no se importa aquí.
 */
@Module({
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
  exports: [CotizacionesService],
})
export class CotizacionesModule {}
