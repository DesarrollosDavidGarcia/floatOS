import { Module } from '@nestjs/common';
import { ArchivosExpedienteUseCase } from '../../../../application/conductores/archivos-expediente.usecase';

/**
 * Provee el caso de uso de archivos de evidencia del expediente. Lo importan
 * tanto ConductoresModule (endpoints REST) como cada módulo de sección
 * (para limpiar los archivos al borrar un registro). Depende solo de los
 * módulos globales Prisma y Storage.
 */
@Module({
  providers: [ArchivosExpedienteUseCase],
  exports: [ArchivosExpedienteUseCase],
})
export class ArchivosExpedienteModule {}
