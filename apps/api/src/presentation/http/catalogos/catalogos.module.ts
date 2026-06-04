import { Module } from '@nestjs/common';
import { CatalogosController } from './catalogos.controller';
import { CatalogosUseCase } from '../../../application/catalogos/catalogos.usecase';

@Module({
  controllers: [CatalogosController],
  providers: [CatalogosUseCase],
  exports: [CatalogosUseCase],
})
export class CatalogosModule {}
