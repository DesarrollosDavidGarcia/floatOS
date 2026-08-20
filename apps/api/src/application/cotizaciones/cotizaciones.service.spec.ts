import { EstadoCotizacion } from '@prisma/client';
import { CotizacionesService } from './cotizaciones.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';

/**
 * Monta el servicio con una cotización en el estado dado. `$transaction` ejecuta
 * el callback con el mismo mock, que es lo que hace el cliente real de Prisma.
 */
function crear(estadoActual: EstadoCotizacion) {
  const aceptada = {
    id: 'cot1',
    viajeId: 'v1',
    estado: EstadoCotizacion.ACEPTADA,
    total: 29712.31,
    moneda: 'MXN',
  };
  const cotizacionUpdate = jest.fn().mockResolvedValue(aceptada);
  const viajeUpdate = jest.fn().mockResolvedValue({ id: 'v1' });
  const prisma = {
    cotizacion: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ estado: estadoActual, enviadaEn: new Date() }),
      update: cotizacionUpdate,
    },
    viaje: { update: viajeUpdate },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        cotizacion: { update: cotizacionUpdate },
        viaje: { update: viajeUpdate },
      }),
    ),
  } as unknown as PrismaService;
  const service = new CotizacionesService(
    prisma,
    { enviar: jest.fn() } as unknown as EmailService,
    {} as unknown as TrackingGateway,
  );
  return { service, viajeUpdate };
}

describe('CotizacionesService: aceptar fija el precio del viaje', () => {
  it('copia el total de la cotización al precioAcordado del viaje', async () => {
    const { service, viajeUpdate } = crear(EstadoCotizacion.ENVIADA);
    await service.cambiarEstado('cot1', EstadoCotizacion.ACEPTADA);
    // Aceptar es el acto que fija el ingreso: si el viaje no se actualizara,
    // quedaría una cotización aceptada sin margen calculable.
    expect(viajeUpdate).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { precioAcordado: 29712.31, moneda: 'MXN' },
    });
  });

  it('no toca el precio del viaje al rechazar', async () => {
    const { service, viajeUpdate } = crear(EstadoCotizacion.ENVIADA);
    await service.cambiarEstado('cot1', EstadoCotizacion.RECHAZADA);
    expect(viajeUpdate).not.toHaveBeenCalled();
  });

  it('no toca el precio del viaje al enviar', async () => {
    const { service, viajeUpdate } = crear(EstadoCotizacion.BORRADOR);
    await service.cambiarEstado('cot1', EstadoCotizacion.ENVIADA);
    expect(viajeUpdate).not.toHaveBeenCalled();
  });
});
