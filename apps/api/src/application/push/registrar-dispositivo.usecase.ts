import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** Alta/baja de tokens FCM del conductor (un registro por dispositivo). */
@Injectable()
export class RegistrarDispositivoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra (o reasigna) un token de dispositivo al conductor. El token es
   * único: si ya existía en otro conductor (mismo teléfono reusado), se mueve.
   */
  async registrar(
    conductorId: string,
    token: string,
    plataforma?: string,
  ): Promise<void> {
    await this.prisma.dispositivoPush.upsert({
      where: { token },
      create: { conductorId, token, plataforma },
      update: { conductorId, plataforma },
    });
  }

  /** Da de baja un token (logout / desactivación de notificaciones). */
  async baja(token: string): Promise<void> {
    await this.prisma.dispositivoPush.deleteMany({ where: { token } });
  }
}
