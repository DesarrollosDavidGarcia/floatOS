import { Module } from '@nestjs/common';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesUseCase } from '../../../../application/conductores/expediente/evaluaciones.usecase';

@Module({
  controllers: [EvaluacionesController],
  providers: [EvaluacionesUseCase],
})
export class EvaluacionesModule {}
