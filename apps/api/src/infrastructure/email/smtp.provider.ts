import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MailProvider, MensajeCorreo } from './mail-provider';

/**
 * Proveedor SMTP (Nodemailer). Configuración por env: SMTP_HOST, SMTP_PORT,
 * SMTP_USER, SMTP_PASSWORD. Inicializa el transporte de forma perezosa.
 */
@Injectable()
export class SmtpMailProvider implements MailProvider {
  readonly nombre = 'SMTP';
  private readonly logger = new Logger(SmtpMailProvider.name);
  private transporter: Transporter | null = null;
  private inicializado = false;

  private init(): void {
    if (this.inicializado) return;
    this.inicializado = true;
    const host = process.env.SMTP_HOST;
    if (!host) return;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        // 465 implica TLS implícito; el resto usa STARTTLS.
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    } catch (e) {
      this.logger.error(`No se pudo inicializar SMTP: ${(e as Error).message}`);
    }
  }

  disponible(): boolean {
    this.init();
    return this.transporter !== null;
  }

  async enviar(m: MensajeCorreo, from: string): Promise<void> {
    this.init();
    if (!this.transporter) throw new Error('SMTP no configurado');
    const unir = (v?: string | string[]) =>
      Array.isArray(v) ? v.join(', ') : v || undefined;
    await this.transporter.sendMail({
      from,
      to: unir(m.to),
      cc: unir(m.cc),
      bcc: unir(m.bcc),
      subject: m.subject,
      text: m.text,
      html: m.html,
      attachments: m.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }
}
