import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthPrincipal } from '../decorators/current-user.decorator';

/** Permite el acceso solo si el principal autenticado es de tipo 'admin'. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthPrincipal | undefined;
    if (user?.type !== 'admin') {
      throw new ForbiddenException('Se requiere rol de administrador');
    }
    return true;
  }
}
