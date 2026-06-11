import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const VERSION = 'v1';
const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12; // recomendado para GCM

/**
 * Cifrado simétrico de secretos en reposo (AES-256-GCM). La llave es POR
 * INSTANCIA: se toma de `SECRETS_KEY` (recomendado, 32 bytes en hex/base64 o
 * cualquier passphrase, que se normaliza con SHA-256); si no está, se deriva de
 * `JWT_SECRET` con un aviso. El formato almacenado es
 * `v1:base64(iv):base64(tag):base64(ciphertext)`, con versión para rotación.
 *
 * Los valores ya en claro (sin el prefijo de versión) se devuelven tal cual al
 * descifrar, para migrar sin romper datos previos.
 */
@Injectable()
export class SecretCryptoService {
  private readonly logger = new Logger(SecretCryptoService.name);
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.SECRETS_KEY;
    if (raw && raw.trim()) {
      // Normaliza cualquier passphrase/clave a 32 bytes con SHA-256.
      this.key = createHash('sha256').update(raw.trim()).digest();
    } else {
      this.key = createHash('sha256')
        .update(process.env.JWT_SECRET ?? 'flotaos-dev-secret')
        .digest();
      this.logger.warn(
        'SECRETS_KEY no configurada; derivando la llave de JWT_SECRET. ' +
          'Configura SECRETS_KEY en producción (y no rotes JWT_SECRET sin migrar los secretos).',
      );
    }
  }

  /** ¿El valor ya está cifrado por este servicio? */
  esCifrado(valor: string | null | undefined): boolean {
    return typeof valor === 'string' && valor.startsWith(`${VERSION}:`);
  }

  /** Cifra un texto plano. Devuelve el sobre `v1:iv:tag:ct` (base64). */
  cifrar(plano: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITMO, this.key, iv);
    const ct = Buffer.concat([cipher.update(plano, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      VERSION,
      iv.toString('base64'),
      tag.toString('base64'),
      ct.toString('base64'),
    ].join(':');
  }

  /** Descifra un sobre `v1:...`. Si el valor no está cifrado, lo devuelve igual. */
  descifrar(almacenado: string): string {
    if (!this.esCifrado(almacenado)) return almacenado; // legado en claro
    const [, ivB64, tagB64, ctB64] = almacenado.split(':');
    const decipher = createDecipheriv(
      ALGORITMO,
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
