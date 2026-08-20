import { Reflector } from '@nestjs/core';
import { ViajesController } from './viajes.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * `AdminGuard` sin `@Roles(...)` deja pasar a CUALQUIER usuario del panel,
 * monitorista incluido: solo exige que no sea un conductor. Es un descuido fácil
 * —y ya ocurrido— poner el guard y olvidar el decorador, así que la restricción
 * del margen queda fijada aquí.
 */
describe('ViajesController: quién puede ver el margen', () => {
  const reflector = new Reflector();

  it('el margen exige rol ADMIN', () => {
    const roles = reflector.get(ROLES_KEY, ViajesController.prototype.margen);
    expect(roles).toEqual(['ADMIN']);
  });

  it('el detalle del viaje NO exige ADMIN: el monitorista opera viajes', () => {
    const roles = reflector.get(ROLES_KEY, ViajesController.prototype.detalle);
    expect(roles).toBeUndefined();
  });
});
