import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Compara dos secretos en tiempo constante (sin fuga por timing ni por longitud).
 * Se hashea cada lado con SHA-256 para obtener buffers de igual tamaño antes de
 * `timingSafeEqual`, evitando además revelar la longitud de la clave esperada.
 */
function comparacionSegura(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Autenticación máquina-a-máquina por API key (header `X-Api-Key`), para
 * clientes de servicio como n8n (bot de cotización). No usa el JWT del panel.
 *
 * La clave esperada vive en `BOT_API_KEY`. Si la variable no está configurada,
 * el endpoint responde 503 (la funcionalidad del bot está deshabilitada) en vez
 * de quedar abierto.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const recibida = req.headers['x-api-key'];
    const esperada = process.env.BOT_API_KEY;

    if (!esperada) {
      throw new ServiceUnavailableException(
        'La API del bot no está configurada en este entorno.',
      );
    }
    if (typeof recibida !== 'string' || !comparacionSegura(recibida, esperada)) {
      throw new UnauthorizedException('API key inválida o ausente.');
    }
    return true;
  }
}
