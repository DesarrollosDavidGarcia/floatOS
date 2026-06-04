import { Module, OnModuleInit } from '@nestjs/common';
import { EscaneoVencimientosService } from '../../../application/alertas/escaneo-vencimientos.service';
import { EmailService } from '../../../infrastructure/email/email.service';
import { AlertasQueue } from '../../../infrastructure/queues/alertas.queue';
import { AlertasWorker } from '../../../infrastructure/queues/alertas.worker';
import { AlertasController } from './alertas.controller';

/**
 * Módulo de alertas de vencimiento de documentos.
 *
 * - Endpoint REST del centro de alertas (cálculo on-demand).
 * - Cola BullMQ con job repetible diario (cron) + worker que notifica por email.
 *
 * Inicia cola y worker en OnModuleInit; ambos toleran que Redis no esté
 * disponible al arrancar (capturan y registran el error). La limpieza la
 * hacen AlertasQueue/AlertasWorker en sus propios OnModuleDestroy.
 *
 * PrismaModule es @Global: PrismaService se inyecta sin importarlo aquí.
 */
@Module({
  controllers: [AlertasController],
  providers: [
    EscaneoVencimientosService,
    EmailService,
    AlertasQueue,
    AlertasWorker,
  ],
  exports: [EscaneoVencimientosService],
})
export class AlertasModule implements OnModuleInit {
  constructor(
    private readonly queue: AlertasQueue,
    private readonly worker: AlertasWorker,
  ) {}

  async onModuleInit(): Promise<void> {
    // El worker antes que la cola para no perder jobs encolados de inmediato.
    this.worker.iniciar();
    await this.queue.iniciar();
  }
}
