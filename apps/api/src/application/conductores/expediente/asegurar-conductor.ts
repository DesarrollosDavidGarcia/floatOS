import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Verifica que el conductor exista (chequeo de existencia barato, sólo el id)
 * o lanza 404. Fuente única para los 9 sub-recursos del expediente, que antes
 * repetían este bloque idéntico.
 */
export async function asegurarConductorExiste(
  prisma: PrismaService,
  conductorId: string,
): Promise<void> {
  const conductor = await prisma.conductor.findUnique({
    where: { id: conductorId },
    select: { id: true },
  });
  if (!conductor) {
    throw new NotFoundException(`Conductor con id ${conductorId} no encontrado`);
  }
}
