import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthService, JwtPayload } from './auth.service';

/**
 * AuthService mock determinista: verificarRefreshToken devuelve el payload dado,
 * compararRefreshToken devuelve `coincide`, y generarTokens/hashRefreshToken
 * devuelven valores fijos para inspeccionar la rotación.
 */
function authServiceMock(opts: {
  payload?: JwtPayload;
  verificaFalla?: boolean;
  coincide?: boolean;
}) {
  return {
    verificarRefreshToken: jest.fn(async () => {
      if (opts.verificaFalla) throw new Error('jwt invalido');
      return opts.payload as JwtPayload;
    }),
    compararRefreshToken: jest.fn().mockResolvedValue(opts.coincide ?? true),
    generarTokens: jest.fn().mockResolvedValue({
      accessToken: 'nuevo-access',
      refreshToken: 'nuevo-refresh',
    }),
    hashRefreshToken: jest.fn().mockResolvedValue('hash-nuevo'),
  } as unknown as AuthService;
}

function usuario(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    nombre: 'Admin',
    email: 'a@x.com',
    rol: 'ADMIN',
    activo: true,
    refreshTokenHash: 'hash-viejo',
    ...overrides,
  };
}

describe('RefreshTokenUseCase rotación + autorización', () => {
  it('rota el par de tokens, re-lee el rol y persiste el nuevo hash (admin válido)', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(usuario()), update },
      conductor: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const auth = authServiceMock({
      payload: { sub: 'a1', type: 'admin', rol: 'ADMIN' },
      coincide: true,
    });
    const uc = new RefreshTokenUseCase(prisma, auth);

    const res = await uc.execute('refresh-viejo');

    expect(res.accessToken).toBe('nuevo-access');
    expect(res.refreshToken).toBe('nuevo-refresh');
    // Re-lee el rol actual del admin desde la entidad cargada.
    expect((auth.generarTokens as jest.Mock).mock.calls[0][0]).toMatchObject({
      sub: 'a1',
      type: 'admin',
      rol: 'ADMIN',
    });
    // Invalida el refresh anterior persistiendo el hash del nuevo.
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data).toEqual({ refreshTokenHash: 'hash-nuevo' });
  });

  it('rechaza un refresh con firma/expiración inválida (401)', async () => {
    const prisma = {
      usuario: { findUnique: jest.fn() },
      conductor: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const auth = authServiceMock({ verificaFalla: true });
    const uc = new RefreshTokenUseCase(prisma, auth);

    await expect(uc.execute('basura')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza cuando el token no coincide con el hash almacenado (401)', async () => {
    const update = jest.fn();
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(usuario()), update },
      conductor: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const auth = authServiceMock({
      payload: { sub: 'a1', type: 'admin', rol: 'ADMIN' },
      coincide: false,
    });
    const uc = new RefreshTokenUseCase(prisma, auth);

    await expect(uc.execute('refresh-robado')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // No debe rotar (persistir nuevo hash) si el token no coincide.
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza a un usuario inactivo (401)', async () => {
    const update = jest.fn();
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(usuario({ activo: false })),
        update,
      },
      conductor: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const auth = authServiceMock({
      payload: { sub: 'a1', type: 'admin', rol: 'ADMIN' },
      coincide: true,
    });
    const uc = new RefreshTokenUseCase(prisma, auth);

    await expect(uc.execute('refresh-viejo')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza cuando la entidad no tiene refreshTokenHash almacenado (401)', async () => {
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(usuario({ refreshTokenHash: null })),
        update: jest.fn(),
      },
      conductor: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const auth = authServiceMock({
      payload: { sub: 'a1', type: 'admin', rol: 'ADMIN' },
      coincide: true,
    });
    const uc = new RefreshTokenUseCase(prisma, auth);

    await expect(uc.execute('refresh-viejo')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un conductor inexistente (401)', async () => {
    const prisma = {
      usuario: { findUnique: jest.fn() },
      conductor: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const auth = authServiceMock({
      payload: { sub: 'cX', type: 'conductor' },
      coincide: true,
    });
    const uc = new RefreshTokenUseCase(prisma, auth);

    await expect(uc.execute('refresh-viejo')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
