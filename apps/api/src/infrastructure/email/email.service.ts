import { Injectable, Logger } from '@nestjs/common';
import { BrevoMailProvider } from './brevo.provider';
import { SmtpMailProvider } from './smtp.provider';
import type { MailProvider, MensajeCorreo } from './mail-provider';

/**
 * Servicio de correo reutilizable. Elige el proveedor activo (Brevo si hay key,
 * si no SMTP) y expone `enviar()` con soporte de adjuntos. No propaga errores:
 * registra y devuelve si se envió, para que ninguna feature se caiga por correo.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly brevo: BrevoMailProvider,
    private readonly smtp: SmtpMailProvider,
  ) {}

  private get from(): string {
    return (
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      'no-reply@flotaos.local'
    );
  }

  /** Proveedor activo: Brevo si hay key; si no, SMTP; null si ninguno. */
  private activo(): MailProvider | null {
    if (this.brevo.disponible()) return this.brevo;
    if (this.smtp.disponible()) return this.smtp;
    return null;
  }

  estaConfigurado(): boolean {
    return this.activo() !== null;
  }

  proveedorActivo(): string {
    return this.activo()?.nombre ?? 'ninguno';
  }

  /** Envía un correo con el proveedor activo. `false` si no hay proveedor o falló. */
  async enviar(mensaje: MensajeCorreo): Promise<boolean> {
    const to = Array.isArray(mensaje.to) ? mensaje.to.join(', ') : mensaje.to;
    const provider = this.activo();
    if (!provider) {
      this.logger.log(
        `[correo deshabilitado] a ${to} — "${mensaje.subject}" (sin Brevo/SMTP)`,
      );
      return false;
    }
    try {
      await provider.enviar(mensaje, this.from);
      this.logger.log(
        `Correo enviado vía ${provider.nombre} a ${to}: "${mensaje.subject}"`,
      );
      return true;
    } catch (e) {
      this.logger.error(
        `Falló el envío vía ${provider.nombre} a ${to}: ${(e as Error).message}`,
      );
      return false;
    }
  }
}
