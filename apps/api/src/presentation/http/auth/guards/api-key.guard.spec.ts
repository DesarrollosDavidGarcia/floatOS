import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

/** Construye un ExecutionContext falso con los headers dados. */
function contextoCon(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const guard = new ApiKeyGuard();
  const KEY_ORIGINAL = process.env.BOT_API_KEY;

  afterEach(() => {
    if (KEY_ORIGINAL === undefined) delete process.env.BOT_API_KEY;
    else process.env.BOT_API_KEY = KEY_ORIGINAL;
  });

  it('responde 503 si BOT_API_KEY no está configurada (fail-closed)', () => {
    delete process.env.BOT_API_KEY;
    expect(() => guard.canActivate(contextoCon({ 'x-api-key': 'lo-que-sea' }))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rechaza (401) cuando falta el header', () => {
    process.env.BOT_API_KEY = 'secreto-correcto';
    expect(() => guard.canActivate(contextoCon({}))).toThrow(UnauthorizedException);
  });

  it('rechaza (401) con una key incorrecta', () => {
    process.env.BOT_API_KEY = 'secreto-correcto';
    expect(() =>
      guard.canActivate(contextoCon({ 'x-api-key': 'secreto-malo' })),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza una key con prefijo correcto pero distinta (comparación completa)', () => {
    process.env.BOT_API_KEY = 'secreto-correcto';
    expect(() =>
      guard.canActivate(contextoCon({ 'x-api-key': 'secreto-correcto-extra' })),
    ).toThrow(UnauthorizedException);
  });

  it('acepta la key correcta', () => {
    process.env.BOT_API_KEY = 'secreto-correcto';
    expect(guard.canActivate(contextoCon({ 'x-api-key': 'secreto-correcto' }))).toBe(
      true,
    );
  });
});
