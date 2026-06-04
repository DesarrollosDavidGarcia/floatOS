import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { EscaneoVencimientosService } from '../../application/alertas/escaneo-vencimientos.service';
import { AlertaVencimiento } from '../../application/alertas/alertas.types';
import { EmailService } from '../email/email.service';
import {
  COLA_ALERTAS,
  UMBRALES_DIAS,
  crearConexionRedis,
} from './redis.connection';

/**
 * Worker BullMQ que procesa los jobs de la cola 'alertas-vencimiento'.
 *
 * Para cada documento que vence exactamente a 7/3/1 días, registra la alerta
 * en consola y envía un correo al admin (si SMTP está configurado).
 *
 * Tolerante a Redis caído: errores de conexión se registran sin tumbar el
 * arranque.
 */
@Injectable()
export class AlertasWorker implements OnModuleDestroy {
  private readonly logger = new Logger(AlertasWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly escaneo: EscaneoVencimientosService,
    private readonly email: EmailService,
  ) {}

  /** Crea el worker que consume la cola. Captura errores para no tumbar el arranque. */
  iniciar(): void {
    try {
      this.worker = new Worker(
        COLA_ALERTAS,
        async (job: Job) => this.procesar(job),
        {
          connection: crearConexionRedis(),
          concurrency: 1,
        },
      );

      this.worker.on('error', (err) => {
        this.logger.error(
          `Error en el worker de '${COLA_ALERTAS}' (¿Redis disponible?): ${err.message}`,
        );
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(
          `Job '${job?.name ?? '?'}' (${job?.id ?? '?'}) falló: ${err.message}`,
        );
      });

      this.logger.log(`Worker de '${COLA_ALERTAS}' iniciado.`);
    } catch (error) {
      this.logger.error(
        `No se pudo iniciar el worker de alertas (se continúa sin él): ${(error as Error).message}`,
      );
    }
  }

  /** Lógica del job: escanear umbrales y notificar. */
  private async procesar(job: Job): Promise<{ alertas: number }> {
    this.logger.log(
      `Procesando job '${job.name}' (${job.id}): escaneo de vencimientos.`,
    );

    const alertas = await this.escaneo.escanearUmbrales(UMBRALES_DIAS);

    if (alertas.length === 0) {
      this.logger.log('Escaneo completado: sin documentos por vencer hoy.');
      return { alertas: 0 };
    }

    for (const alerta of alertas) {
      this.registrarEnConsola(alerta);
    }

    await this.notificarAdmin(alertas);

    this.logger.log(`Escaneo completado: ${alertas.length} alerta(s).`);
    return { alertas: alertas.length };
  }

  private registrarEnConsola(a: AlertaVencimiento): void {
    const fecha = a.fechaVencimiento.toISOString().slice(0, 10);
    this.logger.warn(
      `ALERTA [${a.tipo}] ${a.entidad} — ${a.tipoDocumento} vence el ${fecha} (en ${a.diasRestantes} día(s)).`,
    );
  }

  private async notificarAdmin(alertas: AlertaVencimiento[]): Promise<void> {
    const destino = process.env.SMTP_FROM ?? process.env.SMTP_USER;
    if (!destino) {
      this.logger.warn(
        'Sin destinatario admin (SMTP_FROM/SMTP_USER): solo se registraron las alertas en consola.',
      );
      return;
    }

    const lineas = alertas.map((a) => {
      const fecha = a.fechaVencimiento.toISOString().slice(0, 10);
      const quien = a.tipo === 'unidad' ? 'Unidad' : 'Conductor';
      return `• [${quien}] ${a.entidad} — ${a.tipoDocumento}: vence el ${fecha} (en ${a.diasRestantes} día(s))`;
    });

    const text = [
      'Documentos próximos a vencer en su flota:',
      '',
      ...lineas,
      '',
      'Revise el centro de alertas en el panel para más detalle.',
    ].join('\n');

    const html = [
      '<h2>Documentos próximos a vencer</h2>',
      '<ul>',
      ...alertas.map((a) => {
        const fecha = a.fechaVencimiento.toISOString().slice(0, 10);
        const quien = a.tipo === 'unidad' ? 'Unidad' : 'Conductor';
        return `<li><strong>[${quien}] ${a.entidad}</strong> — ${a.tipoDocumento}: vence el ${fecha} (en ${a.diasRestantes} día(s))</li>`;
      }),
      '</ul>',
      '<p>Revise el centro de alertas en el panel para más detalle.</p>',
    ].join('');

    await this.email.enviar({
      to: destino,
      subject: `FlotaOS — ${alertas.length} documento(s) por vencer`,
      text,
      html,
    });
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
