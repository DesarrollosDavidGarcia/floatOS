import { Module } from '@nestjs/common';
import { ExamenesMedicosController } from './examenes-medicos.controller';
import { ExamenesMedicosUseCase } from '../../../../application/conductores/expediente/examenes-medicos.usecase';

@Module({
  controllers: [ExamenesMedicosController],
  providers: [ExamenesMedicosUseCase],
})
export class ExamenesMedicosModule {}
