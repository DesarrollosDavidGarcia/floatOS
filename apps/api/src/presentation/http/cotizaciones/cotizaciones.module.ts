import { Module, OnModuleInit } from '@nestjs/common';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesService } from '../../../application/cotizaciones/cotizaciones.service';
import { EmailModule } from '../../../infrastructure/email/email.module';
import { TrackingModule } from '../../ws/tracking/tracking.module';
import { CotizacionesQueue } from '../../../infrastructure/queues/cotizaciones.queue';
import { CotizacionesWorker } from '../../../infrastructure/queues/cotizaciones.worker';

/**
 * Módulo de Cotizaciones (motor de cálculo + persistencia + PDF + envío).
 *
 * - PrismaModule es @Global; EmailModule provee el servicio de correo.
 * - TrackingModule exporta el gateway WS para emitir `cotizacion:actualizada`.
 * - Cola + worker BullMQ para el envío asíncrono del correo. Se inician en
 *   OnModuleInit (worker antes que la cola para no perder jobs); ambos toleran
 *   que Redis no esté disponible al arrancar.
 */
@Module({
  imports: [EmailModule, TrackingModule],
  controllers: [CotizacionesController],
  providers: [CotizacionesService, CotizacionesQueue, CotizacionesWorker],
  exports: [CotizacionesService],
})
export class CotizacionesModule implements OnModuleInit {
  constructor(
    private readonly queue: CotizacionesQueue,
    private readonly worker: CotizacionesWorker,
  ) {}

  async onModuleInit(): Promise<void> {
    // El worker antes que la cola para no perder jobs encolados de inmediato.
    this.worker.iniciar();
    await this.queue.iniciar();
  }
}
