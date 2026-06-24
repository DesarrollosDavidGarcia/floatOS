import { ConnectionOptions } from 'bullmq';

/**
 * Construye las opciones de conexión a Redis para BullMQ a partir de
 * REDIS_URL (p. ej. redis://localhost:6379). Si no está definida, usa
 * localhost:6379 por defecto.
 *
 * `maxRetriesPerRequest: null` es requerido por BullMQ para los workers.
 * No lanzamos error aquí: la tolerancia a Redis caído se maneja en el
 * módulo capturando los eventos de error de cola/worker.
 */
export function crearConexionRedis(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // URL inválida: degradar a localhost para no tumbar el arranque.
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    // BullMQ exige null para workers/blocking commands.
    maxRetriesPerRequest: null,
  };
}

/** Nombre canónico de la cola de alertas de vencimiento. */
export const COLA_ALERTAS = 'alertas-vencimiento';

/** Nombre del job repetible diario. */
export const JOB_ESCANEO_DIARIO = 'escaneo-diario';

/** Cron del escaneo diario (8:00 AM). */
export const CRON_ESCANEO_DIARIO = '0 8 * * *';

/** Umbrales (en días) que disparan alerta por email. */
export const UMBRALES_DIAS = [7, 3, 1];

/**
 * Job repetible de purga de la tabla `ubicaciones_conductor`. Se registra en la
 * MISMA cola de alertas (segundo tipo de job) para minimizar plumbing; el worker
 * ramifica por `job.name`.
 */
export const JOB_PURGA_UBICACIONES = 'purga-ubicaciones';

/** Cron de la purga diaria (3:00 AM). */
export const CRON_PURGA_UBICACIONES = '0 3 * * *';

/** Retención (en días) de los puntos GPS antes de purgarse. */
export const DIAS_RETENCION_UBICACIONES = 90;

/** Nombre canónico de la cola de envío de cotizaciones (on-demand). */
export const COLA_COTIZACIONES = 'cotizaciones';

/** Nombre del job de envío de una cotización por correo. */
export const JOB_ENVIAR_COTIZACION = 'enviar-cotizacion';
