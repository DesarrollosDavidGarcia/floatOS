import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import { AuthPrincipal } from '../decorators/current-user.decorator';
import { RolPanel } from '../decorators/roles.decorator';

/**
 * Construye un ExecutionContext mínimo cuyo request.user es el principal dado.
 * Los métodos getHandler/getClass solo se usan como llaves para el Reflector,
 * que aquí está mockeado, así que basta con stubs.
 */
function contextoCon(user: AuthPrincipal | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as unknown as ExecutionContext;
}

/** Reflector mock que devuelve los roles indicados por @Roles (o undefined). */
function reflectorCon(roles: RolPanel[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
}

describe('AdminGuard', () => {
  it('rechaza a un principal que no es admin (conductor)', () => {
    const guard = new AdminGuard(reflectorCon(undefined));
    const ctx = contextoCon({ sub: 'c1', type: 'conductor' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rechaza cuando no hay principal autenticado', () => {
    const guard = new AdminGuard(reflectorCon(undefined));
    const ctx = contextoCon(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('ADMIN pasa cuando no hay @Roles en el handler', () => {
    const guard = new AdminGuard(reflectorCon(undefined));
    const ctx = contextoCon({ sub: 'a1', type: 'admin', rol: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('MONITORISTA pasa cuando no hay @Roles en el handler', () => {
    const guard = new AdminGuard(reflectorCon(undefined));
    const ctx = contextoCon({ sub: 'm1', type: 'admin', rol: 'MONITORISTA' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('ADMIN pasa siempre, incluso con @Roles(ADMIN)', () => {
    const guard = new AdminGuard(reflectorCon(['ADMIN']));
    const ctx = contextoCon({ sub: 'a1', type: 'admin', rol: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('MONITORISTA es rechazado cuando el handler exige @Roles(ADMIN)', () => {
    const guard = new AdminGuard(reflectorCon(['ADMIN']));
    const ctx = contextoCon({ sub: 'm1', type: 'admin', rol: 'MONITORISTA' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('admin sin rol es rechazado cuando el handler exige @Roles(ADMIN)', () => {
    const guard = new AdminGuard(reflectorCon(['ADMIN']));
    const ctx = contextoCon({ sub: 'a1', type: 'admin' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('MONITORISTA pasa cuando el handler permite @Roles(MONITORISTA)', () => {
    const guard = new AdminGuard(reflectorCon(['MONITORISTA']));
    const ctx = contextoCon({ sub: 'm1', type: 'admin', rol: 'MONITORISTA' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
