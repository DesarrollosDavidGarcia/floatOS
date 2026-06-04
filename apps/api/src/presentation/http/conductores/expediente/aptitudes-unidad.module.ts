import { Module } from '@nestjs/common';
import { AptitudesUnidadController } from './aptitudes-unidad.controller';
import { AptitudesUnidadUseCase } from '../../../../application/conductores/expediente/aptitudes-unidad.usecase';

@Module({
  controllers: [AptitudesUnidadController],
  providers: [AptitudesUnidadUseCase],
  exports: [AptitudesUnidadUseCase],
})
export class AptitudesUnidadModule {}
