import { ConflictException } from '@nestjs/common';
import { EstadoViaje } from '@flotaos/shared-types';
import { CambiarEstadoViajeUseCase } from './cambiar-estado-viaje.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';

/**
 * Monta el caso de uso con un viaje en `estado` y `revisiones` capturadas.
 * La regla que se prueba es la que hace obligatoria la ingesta de campo: sin
 * revisión el viaje no avanza, y esa puerta vive en el backend justamente para
 * que no dependa de la pantalla que la llame.
 */
function crear(estado: EstadoViaje, revisiones: number) {
  const update = jest.fn().mockResolvedValue({ id: 'v1', estado, conductor: null });
  const prisma = {
    viaje: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'v1',
        estado,
        conductorId: 'c1',
        fechaInicio: null,
        fechaEntrega: null,
        estadoPrevioVarado: null,
      }),
      update,
    },
    revisionViaje: { count: jest.fn().mockResolvedValue(revisiones) },
    cotizacion: { count: jest.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  const gateway = {
    emitirCambioEstado: jest.fn(),
    emitirAlerta: jest.fn(),
  } as unknown as TrackingGateway;
  const uc = new CambiarEstadoViajeUseCase(prisma, gateway);
  return { uc, update };
}

describe('CambiarEstadoViajeUseCase: revisión obligatoria', () => {
  it('no deja arrancar sin revisión de salida', async () => {
    const { uc, update } = crear(EstadoViaje.ACEPTADO, 0);
    await expect(
      uc.execute('v1', { estado: EstadoViaje.EN_CAMINO_ORIGEN }, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
    // Y sobre todo: no debe haber tocado el viaje.
    expect(update).not.toHaveBeenCalled();
  });

  it('deja arrancar cuando la revisión de salida existe', async () => {
    const { uc, update } = crear(EstadoViaje.ACEPTADO, 1);
    await uc.execute('v1', { estado: EstadoViaje.EN_CAMINO_ORIGEN }, 'u1');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('no deja cerrar sin revisión de llegada', async () => {
    const { uc, update } = crear(EstadoViaje.EN_TRANSITO, 0);
    await expect(
      uc.execute('v1', { estado: EstadoViaje.ENTREGADO }, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('las transiciones intermedias no exigen revisión', async () => {
    // Solo se exige al arrancar y al cerrar: pedirla en cada paso sería fricción
    // sin dato nuevo, porque el odómetro no cambia entre CARGANDO y EN_TRANSITO.
    const { uc, update } = crear(EstadoViaje.EN_CAMINO_ORIGEN, 0);
    await uc.execute('v1', { estado: EstadoViaje.CARGANDO }, 'u1');
    expect(update).toHaveBeenCalledTimes(1);
  });
});
