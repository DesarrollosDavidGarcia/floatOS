import { Module } from '@nestjs/common';
import { EventosLaboralesController } from './eventos-laborales.controller';
import { EventosLaboralesUseCase } from '../../../../application/conductores/expediente/eventos-laborales.usecase';

@Module({
  controllers: [EventosLaboralesController],
  providers: [EventosLaboralesUseCase],
})
export class EventosLaboralesModule {}
