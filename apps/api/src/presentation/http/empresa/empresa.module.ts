import { Module } from '@nestjs/common';
import { EmpresaController } from './empresa.controller';
import { EmpresaUseCase } from '../../../application/empresa/empresa.usecase';

@Module({
  controllers: [EmpresaController],
  providers: [EmpresaUseCase],
  exports: [EmpresaUseCase],
})
export class EmpresaModule {}
