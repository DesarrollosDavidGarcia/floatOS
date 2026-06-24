import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { CotizacionesService } from '../../application/cotizaciones/cotizaciones.service';
import type { DatosEnviarCotizacion } from './cotizaciones.queue';
import { COLA_COTIZACIONES, crearConexionRedis } from './redis.connection';

/**
 * Worker BullMQ que consume la cola 'cotizaciones': procesa el envío del correo
 * (PDF + SMTP + marca ENVIADA + emisión WS) delegando en
 * `CotizacionesService.procesarEnvio`.
 *
 * Tolerante a Redis caído: errores de conexión se registran sin tumbar el
 * arranque. Si `procesarEnvio` lanza, BullMQ reintenta según los `attempts` de
 * la cola.
 */
@Injectable()
export class CotizacionesWorker implements OnModuleDestroy {
  private readonly logger = new Logger(CotizacionesWorker.name);
  private worker: Worker | null = null;

  constructor(private readonly cotizaciones: CotizacionesService) {}

  /** Crea el worker que consume la cola. Captura errores para no tumbar el arranque. */
  iniciar(): void {
    try {
      this.worker = new Worker(
        COLA_COTIZACIONES,
        async (job: Job<DatosEnviarCotizacion>) => this.procesar(job),
        {
          connection: crearConexionRedis(),
          concurrency: 3,
        },
      );

      this.worker.on('error', (err) => {
        this.logger.error(
          `Error en el worker de '${COLA_COTIZACIONES}' (¿Redis disponible?): ${err.message}`,
        );
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(
          `Job '${job?.name ?? '?'}' (${job?.id ?? '?'}) falló: ${err.message}`,
        );
      });

      this.logger.log(`Worker de '${COLA_COTIZACIONES}' iniciado.`);
    } catch (error) {
      this.logger.error(
        `No se pudo iniciar el worker de cotizaciones (se continúa sin él): ${(error as Error).message}`,
      );
    }
  }

  /** Procesa un job de envío de cotización. */
  private async procesar(job: Job<DatosEnviarCotizacion>): Promise<void> {
    const { cotizacionId, opts } = job.data;
    this.logger.log(
      `Procesando job '${job.name}' (${job.id}): envío de cotización ${cotizacionId}.`,
    );
    await this.cotizaciones.procesarEnvio(cotizacionId, opts ?? {});
    this.logger.log(`Cotización ${cotizacionId} enviada.`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch((err: Error) =>
        this.logger.error(`Error al cerrar el worker: ${err.message}`),
      );
      this.worker = null;
    }
  }
}
