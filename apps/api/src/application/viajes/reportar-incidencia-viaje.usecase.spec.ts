import { BadRequestException } from '@nestjs/common';
import { EstadoViaje } from '@prisma/client';
import { ReportarIncidenciaViajeUseCase } from './reportar-incidencia-viaje.usecase';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { CambiarEstadoViajeUseCase } from './cambiar-estado-viaje.usecase';

function crear(viaje: Record<string, unknown> | null) {
  const create = jest.fn().mockResolvedValue({ id: 'inc1', descripcion: 'x' });
  const prisma = {
    viaje: { findUnique: jest.fn().mockResolvedValue(viaje) },
    incidenciaConductor: { create },
  } as unknown as PrismaService;
  const tracking = { emitirIncidencia: jest.fn() } as unknown as TrackingGateway;
  const cambiarEstado = { execute: jest.fn() } as unknown as CambiarEstadoViajeUseCase;
  const uc = new ReportarIncidenciaViajeUseCase(prisma, tracking, cambiarEstado);
  return { uc, prisma, tracking, cambiarEstado, create };
}

const VIAJE_BASE = {
  id: 'v1',
  folio: 6,
  estado: EstadoViaje.EN_TRANSITO,
  conductorId: 'c1',
  conductor: { nombre: 'Laura', apellidos: 'Méndez' },
};

describe('ReportarIncidenciaViajeUseCase', () => {
  it('crea la incidencia, marca VARADO y avisa al panel', async () => {
    const { uc, create, tracking, cambiarEstado } = crear({ ...VIAJE_BASE });

    const res = await uc.execute(
      'v1',
      { tipo: 'AVERIA', descripcion: 'motor', marcarVarado: true },
      'c1',
      'c1',
    );

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ conductorId: 'c1', viajeId: 'v1', tipo: 'AVERIA', gravedad: 'ALTA' });
    expect(cambiarEstado.execute).toHaveBeenCalledTimes(1); // transición a VARADO
    expect(tracking.emitirIncidencia).toHaveBeenCalledTimes(1);
    expect(res.varado).toBe(true);
  });

  it('no marca VARADO si el viaje no está en ruta', async () => {
    const { uc, cambiarEstado } = crear({ ...VIAJE_BASE, estado: EstadoViaje.ASIGNADO });

    const res = await uc.execute('v1', { tipo: 'AVERIA', marcarVarado: true }, 'c1', 'c1');

    expect(cambiarEstado.execute).not.toHaveBeenCalled();
    expect(res.varado).toBe(false);
  });

  it('un conductor no puede reportar en un viaje ajeno', async () => {
    const { uc } = crear({ ...VIAJE_BASE });
    await expect(
      uc.execute('v1', { tipo: 'OTRO' }, 'c2', 'c2'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falla si el viaje no tiene conductor asignado', async () => {
    const { uc } = crear({ ...VIAJE_BASE, conductorId: null, conductor: null });
    await expect(
      uc.execute('v1', { tipo: 'AVERIA' }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
