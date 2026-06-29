import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as admin from 'firebase-admin';
import { PrismaService } from '../database/prisma.service';

/** Contenido de una notificación push. */
export interface PushMensaje {
  titulo: string;
  cuerpo: string;
  /** Canal Android (debe existir en la app): 'chat' | 'general'. */
  canalId?: string;
  /** Datos para la navegación al tocar (todo string, requisito de FCM). */
  data?: Record<string, string>;
}

/**
 * Envío de push a los dispositivos del conductor vía FCM (Firebase Admin).
 * Si no hay credencial configurada (`FIREBASE_SERVICE_ACCOUNT_PATH` o
 * `FIREBASE_SERVICE_ACCOUNT`), queda deshabilitado y todos los envíos son no-op,
 * para no romper en entornos sin Firebase.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    try {
      const credential = this.cargarCredencial();
      if (!credential) {
        this.logger.warn(
          'FIREBASE no configurado: las notificaciones push quedan deshabilitadas.',
        );
        return;
      }
      this.app = admin.apps.length
        ? admin.app()
        : admin.initializeApp({ credential });
      this.logger.log('Firebase Admin inicializado: push habilitado.');
    } catch (e) {
      this.logger.error(
        'No se pudo inicializar Firebase Admin; push deshabilitado.',
        e as Error,
      );
    }
  }

  get habilitado(): boolean {
    return this.app != null;
  }

  private cargarCredencial(): admin.credential.Credential | null {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inline) {
      return admin.credential.cert(JSON.parse(inline));
    }
    const ruta = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (ruta) {
      return admin.credential.cert(
        JSON.parse(readFileSync(ruta, 'utf8')) as admin.ServiceAccount,
      );
    }
    // firebase-admin también lee GOOGLE_APPLICATION_CREDENTIALS por defecto.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return admin.credential.applicationDefault();
    }
    return null;
  }

  /**
   * Envía un push a todos los dispositivos del conductor. Limpia de la BD los
   * tokens que FCM reporta como inválidos/desregistrados.
   */
  async enviarAConductor(conductorId: string, msg: PushMensaje): Promise<void> {
    if (!this.app) return;
    const dispositivos = await this.prisma.dispositivoPush.findMany({
      where: { conductorId },
      select: { token: true },
    });
    if (dispositivos.length === 0) return;
    const tokens = dispositivos.map((d) => d.token);

    try {
      const res = await admin.messaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title: msg.titulo, body: msg.cuerpo },
        data: msg.data ?? {},
        android: {
          priority: 'high',
          notification: { channelId: msg.canalId ?? 'general' },
        },
      });

      const invalidos: string[] = [];
      res.responses.forEach((r, i) => {
        if (r.success) return;
        const code = r.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidos.push(tokens[i]);
        }
      });
      if (invalidos.length > 0) {
        await this.prisma.dispositivoPush.deleteMany({
          where: { token: { in: invalidos } },
        });
        this.logger.debug(`Tokens FCM inválidos purgados: ${invalidos.length}`);
      }
    } catch (e) {
      this.logger.error('Error enviando push por FCM.', e as Error);
    }
  }
}
