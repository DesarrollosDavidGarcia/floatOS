import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthPrincipal } from '../decorators/current-user.decorator';
import { ROLES_KEY, RolPanel } from '../decorators/roles.decorator';

/**
 * Exige que el principal autenticado sea de tipo 'admin'. Además, si el
 * handler/controlador declara @Roles(...), exige que el rol del admin esté
 * permitido. Sin @Roles, cualquier admin (ADMIN o MONITORISTA) pasa.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthPrincipal | undefined;
    if (user?.type !== 'admin') {
      throw new ForbiddenException('Se requiere rol de administrador');
    }

    const roles = this.reflector.getAllAndOverride<RolPanel[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (roles && roles.length > 0 && (!user.rol || !roles.includes(user.rol))) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
