import { ConflictException, ForbiddenException } from '@nestjs/common';
import { EstadoViaje } from '@prisma/client';
import { CambiarEstadoViajeUseCase } from './cambiar-estado-viaje.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';

function crear(viaje: Record<string, unknown> | null) {
  const update = jest.fn().mockResolvedValue({ id: 'v1', estado: 'EN_TRANSITO' });
  const prisma = {
    viaje: { findUnique: jest.fn().mockResolvedValue(viaje), update },
  } as unknown as PrismaService;
  const tracking = { emitirCambioEstado: jest.fn() } as unknown as TrackingGateway;
  const uc = new CambiarEstadoViajeUseCase(prisma, tracking);
  return { uc, prisma, tracking, update };
}

describe('CambiarEstadoViajeUseCase.reanudar', () => {
  it('reanuda al estado previo y limpia estadoPrevioVarado', async () => {
    const { uc, update, tracking } = crear({
      id: 'v1',
      estado: EstadoViaje.VARADO,
      conductorId: 'c1',
      estadoPrevioVarado: EstadoViaje.CARGANDO,
    });

    await uc.reanudar('v1', 'admin-1');

    const args = update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'v1', estado: EstadoViaje.VARADO });
    expect(args.data.estado).toBe(EstadoViaje.CARGANDO);
    expect(args.data.estadoPrevioVarado).toBeNull();
    expect(tracking.emitirCambioEstado).toHaveBeenCalledTimes(1);
  });

  it('falla si el viaje no está varado (409)', async () => {
    const { uc } = crear({
      id: 'v1',
      estado: EstadoViaje.EN_TRANSITO,
      conductorId: 'c1',
      estadoPrevioVarado: null,
    });

    await expect(uc.reanudar('v1', 'admin-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('un conductor no puede reanudar un viaje ajeno (403)', async () => {
    const { uc } = crear({
      id: 'v1',
      estado: EstadoViaje.VARADO,
      conductorId: 'c1',
      estadoPrevioVarado: EstadoViaje.EN_TRANSITO,
    });

    await expect(
      uc.reanudar('v1', 'c2', 'c2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('usa EN_TRANSITO como respaldo si no hay estado previo', async () => {
    const { uc, update } = crear({
      id: 'v1',
      estado: EstadoViaje.VARADO,
      conductorId: 'c1',
      estadoPrevioVarado: null,
    });

    await uc.reanudar('v1', 'admin-1');

    expect(update.mock.calls[0][0].data.estado).toBe(EstadoViaje.EN_TRANSITO);
  });
});
