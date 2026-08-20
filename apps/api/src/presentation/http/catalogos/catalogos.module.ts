import { Module } from '@nestjs/common';
import { CatalogosController } from './catalogos.controller';
import { CatalogosAppController } from './catalogos-app.controller';
import { CatalogosUseCase } from '../../../application/catalogos/catalogos.usecase';

@Module({
  controllers: [CatalogosController, CatalogosAppController],
  providers: [CatalogosUseCase],
  exports: [CatalogosUseCase],
})
export class CatalogosModule {}
