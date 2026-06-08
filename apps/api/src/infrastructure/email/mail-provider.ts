/** Adjunto de un correo (p. ej. el PDF de una cotización). */
export interface AdjuntoCorreo {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/** Mensaje de correo independiente del proveedor. */
export interface MensajeCorreo {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: AdjuntoCorreo[];
}

/**
 * Proveedor de envío de correo. Implementaciones: SMTP (Nodemailer) y Brevo (API).
 * `EmailService` elige el activo y nunca propaga errores hacia las features.
 */
export interface MailProvider {
  /** Nombre legible para logs. */
  readonly nombre: string;
  /** ¿Hay configuración suficiente para enviar con este proveedor? */
  disponible(): boolean;
  /** Envía el mensaje; lanza si falla (lo captura EmailService). */
  enviar(mensaje: MensajeCorreo, from: string): Promise<void>;
}
