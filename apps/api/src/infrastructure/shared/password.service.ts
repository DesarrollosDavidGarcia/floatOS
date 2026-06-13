import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

/**
 * Punto único para hashing/comparación con bcrypt.
 * Centraliza el número de rondas para todo el sistema (passwords y refresh tokens).
 */
@Injectable()
export class PasswordService {
  private static readonly ROUNDS = 10;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, PasswordService.ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Hashea un token largo (p. ej. un JWT de refresh). bcrypt ignora todo byte
   * más allá del 72, así que primero condensamos el token con SHA-256 (44 chars
   * en base64) para que la entrada de bcrypt represente el token completo. Sin
   * esto, dos refresh tokens del mismo usuario comparten los primeros 72 bytes
   * (header + sub) y colisionarían en bcrypt, anulando la rotación/revocación.
   */
  hashToken(token: string): Promise<string> {
    return bcrypt.hash(PasswordService.condensar(token), PasswordService.ROUNDS);
  }

  /** Compara un token largo contra su hash (mismo pre-hash que hashToken). */
  compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(PasswordService.condensar(token), hash);
  }

  private static condensar(token: string): string {
    return createHash('sha256').update(token).digest('base64');
  }
}
