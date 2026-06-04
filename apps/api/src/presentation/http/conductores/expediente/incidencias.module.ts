import { Module } from '@nestjs/common';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasUseCase } from '../../../../application/conductores/expediente/incidencias.usecase';

@Module({
  controllers: [IncidenciasController],
  providers: [IncidenciasUseCase],
  exports: [IncidenciasUseCase],
})
export class IncidenciasModule {}
