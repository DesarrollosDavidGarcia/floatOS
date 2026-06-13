import { Module } from '@nestjs/common';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from '../../../application/cotizaciones/cotizaciones.service';
import { EmailModule } from '../../../infrastructure/email/email.module';

/**
 * Módulo de Cotizaciones (motor de cálculo + persistencia + PDF + envío).
 * PrismaModule es @Global; EmailModule provee el servicio de correo reutilizable.
 */
@Module({
  imports: [EmailModule],
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
  exports: [CotizacionesService],
})
export class CotizacionesModule {}
