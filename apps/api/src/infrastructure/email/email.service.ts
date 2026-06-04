import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Servicio de envío de correo vía SMTP (Nodemailer).
 *
 * Configuración por variables de entorno:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM.
 *
 * Si el SMTP no está configurado (falta host), el servicio NO truena: solo
 * registra en consola lo que habría enviado. Esto permite correr el sistema
 * en desarrollo sin un servidor de correo.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private from = '';

  onModuleInit(): void {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn(
        'SMTP no configurado (falta SMTP_HOST). Los correos se registrarán en consola sin enviarse.',
      );
      return;
    }

    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    this.from = process.env.SMTP_FROM ?? user ?? 'no-reply@flotaos.local';

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        // 465 implica conexión TLS implícita; el resto usa STARTTLS.
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`SMTP configurado: ${host}:${port}`);
    } catch (error) {
      this.transporter = null;
      this.logger.error(
        `No se pudo inicializar el transporte SMTP: ${(error as Error).message}`,
      );
    }
  }

  /** Indica si hay un transporte SMTP listo para enviar. */
  estaConfigurado(): boolean {
    return this.transporter !== null;
  }

  /**
   * Envía un correo. Si no hay SMTP configurado, solo lo registra (no truena).
   * Si el envío falla, registra el error y NO lo propaga (las alertas no deben
   * tumbar el job).
   */
  async enviar(opciones: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[SMTP deshabilitado] Correo NO enviado a ${opciones.to} — Asunto: "${opciones.subject}"`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opciones.to,
        subject: opciones.subject,
        text: opciones.text,
        html: opciones.html,
      });
      this.logger.log(`Correo enviado a ${opciones.to}: "${opciones.subject}"`);
    } catch (error) {
      this.logger.error(
        `Falló el envío de correo a ${opciones.to}: ${(error as Error).message}`,
      );
    }
  }
}
