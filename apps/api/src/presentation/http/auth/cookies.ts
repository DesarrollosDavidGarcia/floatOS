import { Request, Response } from 'express';

/**
 * Cookies httpOnly de autenticación para el PANEL WEB. La app móvil (Flutter)
 * sigue usando los tokens del body como bearer; estas cookies no le afectan.
 *
 * Estrategia de seguridad: httpOnly (no accesible por JS → mitiga XSS),
 * Secure en producción (solo HTTPS) y SameSite=Strict (mitiga CSRF: el
 * navegador no envía la cookie en peticiones cross-site). Web y API son
 * same-site en el despliegue instancia-por-cliente detrás de Nginx.
 */
export const COOKIE_ACCESS = 'flotaos_access';
export const COOKIE_REFRESH = 'flotaos_refresh';

/** La cookie de refresh solo viaja a las rutas de auth. (Prefijo global 'api'.) */
const REFRESH_PATH = '/api/auth';

function opcionesBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };
}

/** Setea las cookies de access y refresh con el TTL configurado (en segundos). */
export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(COOKIE_ACCESS, tokens.accessToken, {
    ...opcionesBase(),
    path: '/',
    maxAge: Number(process.env.JWT_ACCESS_TTL) * 1000,
  });
  res.cookie(COOKIE_REFRESH, tokens.refreshToken, {
    ...opcionesBase(),
    path: REFRESH_PATH,
    maxAge: Number(process.env.JWT_REFRESH_TTL) * 1000,
  });
}

/** Borra ambas cookies de auth (logout). Debe usar el mismo path que al setear. */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_ACCESS, { path: '/' });
  res.clearCookie(COOKIE_REFRESH, { path: REFRESH_PATH });
}

/** Extrae el valor de una cookie de un header Cookie crudo (sin cookie-parser). */
export function valorDeCookie(
  raw: string | undefined,
  nombre: string,
): string | null {
  if (!raw) return null;
  for (const par of raw.split(';')) {
    const idx = par.indexOf('=');
    if (idx === -1) continue;
    if (par.slice(0, idx).trim() === nombre) {
      return decodeURIComponent(par.slice(idx + 1).trim());
    }
  }
  return null;
}

/** Lee una cookie de una Request de Express. */
export function leerCookie(req: Request, nombre: string): string | null {
  return valorDeCookie(req.headers?.cookie, nombre);
}
