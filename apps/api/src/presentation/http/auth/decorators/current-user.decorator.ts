import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Principal autenticado extraído del JWT por la JwtStrategy. */
export interface AuthPrincipal {
  sub: string;
  type: 'admin' | 'conductor';
}

/**
 * Devuelve el principal autenticado (request.user) inyectado por Passport.
 * Uso: metodo(@CurrentUser() user: AuthPrincipal) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthPrincipal;
  },
);
