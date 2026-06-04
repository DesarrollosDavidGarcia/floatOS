import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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
}
