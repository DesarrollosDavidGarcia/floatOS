import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  COLA_ALERTAS,
  CRON_ESCANEO_DIARIO,
  JOB_ESCANEO_DIARIO,
  crearConexionRedis,
} from './redis.connection';

/**
 * Encapsula la cola BullMQ de alertas de vencimiento y la programación del
 * job repetible diario.
 *
 * Tolerante a Redis caído: si la conexión falla, se registra el error y el
 * arranque continúa (no se propaga la excepción).
 */
@Injectable()
export class AlertasQueue implements OnModuleDestroy {
  private readonly logger = new Logger(AlertasQueue.name);
  private queue: Queue | null = null;

  /**
   * Crea la cola y registra (idempotente) el job repetible con cron diario.
   * Captura cualquier error de conexión para no tumbar el arranque.
   */
  async iniciar(): Promise<void> {
    try {
      this.queue = new Queue(COLA_ALERTAS, {
        connection: crearConexionRedis(),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        },
      });

      // No propagar errores de conexión: solo registrarlos.
      this.queue.on('error', (err) => {
        this.logger.error(
          `Error en la cola '${COLA_ALERTAS}' (¿Redis disponible?): ${err.message}`,
        );
      });

      // En BullMQ v5 el scheduler está integrado en la Queue; basta con
      // declarar el job repetible. upsertJobScheduler es idempotente.
      await this.queue.upsertJobScheduler(
        JOB_ESCANEO_DIARIO,
        { pattern: CRON_ESCANEO_DIARIO, tz: 'America/Mexico_City' },
        { name: JOB_ESCANEO_DIARIO, data: {} },
      );

      this.logger.log(
        `Cola '${COLA_ALERTAS}' lista. Job diario programado (${CRON_ESCANEO_DIARIO}).`,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo iniciar la cola de alertas (se continúa sin ella): ${(error as Error).message}`,
      );
    }
  }

  /** Encola un escaneo inmediato (útil para pruebas/manuales). No-op si no hay cola. */
  async encolarEscaneoAhora(): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Cola no disponible: no se pudo encolar escaneo manual.');
      return;
    }
    try {
      await this.queue.add(JOB_ESCANEO_DIARIO, {});
    } catch (error) {
      this.logger.error(
        `No se pudo encolar el escaneo manual: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close().catch((err: Error) =>
        this.logger.error(`Error al cerrar la cola: ${err.message}`),
      );
      this.queue = null;
    }
  }
}
