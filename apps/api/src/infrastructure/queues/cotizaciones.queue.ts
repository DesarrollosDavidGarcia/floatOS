import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { OpcionesEnvioCotizacion } from '../../application/cotizaciones/cotizaciones.service';
import {
  COLA_COTIZACIONES,
  JOB_ENVIAR_COTIZACION,
  crearConexionRedis,
} from './redis.connection';

/** Datos del job de envío de cotización: id + opciones de correo capturadas. */
export interface DatosEnviarCotizacion {
  cotizacionId: string;
  opts: OpcionesEnvioCotizacion;
}

/**
 * Cola BullMQ para el envío asíncrono de cotizaciones por correo (on-demand, sin
 * job repetible). Saca del request HTTP la generación de PDF + el envío SMTP.
 *
 * Tolerante a Redis caído: si la conexión falla, se registra el error y el
 * arranque continúa. `encolarEnvio` devuelve `false` cuando no hay cola
 * disponible para que el flujo HTTP haga el fallback síncrono y el envío NUNCA
 * se pierda.
 */
@Injectable()
export class CotizacionesQueue implements OnModuleDestroy {
  private readonly logger = new Logger(CotizacionesQueue.name);
  private queue: Queue | null = null;

  /** Crea la cola. Captura cualquier error de conexión para no tumbar el arranque. */
  async iniciar(): Promise<void> {
    try {
      this.queue = new Queue(COLA_COTIZACIONES, {
        connection: crearConexionRedis(),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      });

      // No propagar errores de conexión: solo registrarlos.
      this.queue.on('error', (err) => {
        this.logger.error(
          `Error en la cola '${COLA_COTIZACIONES}' (¿Redis disponible?): ${err.message}`,
        );
      });

      this.logger.log(`Cola '${COLA_COTIZACIONES}' lista.`);
    } catch (error) {
      this.logger.error(
        `No se pudo iniciar la cola de cotizaciones (se continúa sin ella): ${(error as Error).message}`,
      );
    }
  }

  /**
   * Encola el envío de una cotización. Devuelve `true` si se encoló y `false` si
   * no hay cola disponible (Redis caído / queue null o el `add` falló): en ese
   * caso el llamador debe procesar el envío síncronamente como fallback.
   */
  async encolarEnvio(
    cotizacionId: string,
    opts: OpcionesEnvioCotizacion,
  ): Promise<boolean> {
    if (!this.queue) {
      this.logger.warn(
        'Cola de cotizaciones no disponible: el envío se procesará de forma síncrona.',
      );
      return false;
    }
    try {
      const datos: DatosEnviarCotizacion = { cotizacionId, opts };
      await this.queue.add(JOB_ENVIAR_COTIZACION, datos);
      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo encolar el envío de la cotización ${cotizacionId} (fallback síncrono): ${(error as Error).message}`,
      );
      return false;
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
