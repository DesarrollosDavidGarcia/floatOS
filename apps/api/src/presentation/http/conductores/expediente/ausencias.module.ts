import { Module } from '@nestjs/common';
import { AusenciasController } from './ausencias.controller';
import { AusenciasUseCase } from '../../../../application/conductores/expediente/ausencias.usecase';

@Module({
  controllers: [AusenciasController],
  providers: [AusenciasUseCase],
})
export class AusenciasModule {}
