import { Module } from '@nestjs/common';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasUseCase } from '../../../../application/conductores/expediente/incidencias.usecase';
import { ArchivosExpedienteModule } from './archivos-expediente.module';

@Module({
  imports: [ArchivosExpedienteModule],
  controllers: [IncidenciasController],
  providers: [IncidenciasUseCase],
  exports: [IncidenciasUseCase],
})
export class IncidenciasModule {}
