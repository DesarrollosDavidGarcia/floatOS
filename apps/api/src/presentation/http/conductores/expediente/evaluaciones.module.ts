import { Module } from '@nestjs/common';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesUseCase } from '../../../../application/conductores/expediente/evaluaciones.usecase';
import { ArchivosExpedienteModule } from './archivos-expediente.module';

@Module({
  imports: [ArchivosExpedienteModule],
  controllers: [EvaluacionesController],
  providers: [EvaluacionesUseCase],
})
export class EvaluacionesModule {}
