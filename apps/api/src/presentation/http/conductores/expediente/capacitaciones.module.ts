import { Module } from '@nestjs/common';
import { CapacitacionesController } from './capacitaciones.controller';
import { CapacitacionesUseCase } from '../../../../application/conductores/expediente/capacitaciones.usecase';

@Module({
  controllers: [CapacitacionesController],
  providers: [CapacitacionesUseCase],
})
export class CapacitacionesModule {}
