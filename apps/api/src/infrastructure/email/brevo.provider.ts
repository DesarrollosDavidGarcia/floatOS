import { Injectable } from '@nestjs/common';
import type { MailProvider, MensajeCorreo } from './mail-provider';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Proveedor Brevo (API transaccional). Configuración por env:
 *   BREVO_API_KEY (obligatoria), BREVO_SENDER_EMAIL / BREVO_SENDER_NAME
 *   (remitente verificado en Brevo; si no, se parsea del `from`).
 * El remitente DEBE estar verificado en la cuenta de Brevo.
 */
@Injectable()
export class BrevoMailProvider implements MailProvider {
  readonly nombre = 'Brevo';

  disponible(): boolean {
    return !!process.env.BREVO_API_KEY;
  }

  async enviar(m: MensajeCorreo, from: string): Promise<void> {
    const key = process.env.BREVO_API_KEY;
    if (!key) throw new Error('BREVO_API_KEY no configurada');

    const lista = (v?: string | string[]) =>
      (Array.isArray(v) ? v : v ? [v] : []).map((email) => ({ email }));
    const cc = lista(m.cc);
    const bcc = lista(m.bcc);
    const body = {
      sender: this.remitente(from),
      to: lista(m.to),
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject: m.subject,
      textContent: m.text,
      htmlContent: m.html || undefined,
      attachment: m.attachments?.map((a) => ({
        name: a.filename,
        content: a.content.toString('base64'),
      })),
    };

    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': key,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Brevo HTTP ${res.status} ${detalle}`.trim());
    }
  }

  /** Remitente: env BREVO_SENDER_* o parsea "Nombre <email>" del from. */
  private remitente(from: string): { email: string; name?: string } {
    const email = process.env.BREVO_SENDER_EMAIL;
    const name = process.env.BREVO_SENDER_NAME;
    if (email) return { email, name: name || undefined };
    const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) return { email: m[2], name: m[1] || undefined };
    return { email: from };
  }
}
