import { SetMetadata } from '@nestjs/common';

export type RolPanel = 'ADMIN' | 'MONITORISTA';

export const ROLES_KEY = 'roles';

/**
 * Restringe un handler o controlador a los roles indicados. Solo tiene efecto
 * sobre principals de tipo admin (los conductores nunca traen rol). Sin este
 * decorador, cualquier admin autenticado (ADMIN o MONITORISTA) pasa.
 */
export const Roles = (...roles: RolPanel[]) => SetMetadata(ROLES_KEY, roles);
