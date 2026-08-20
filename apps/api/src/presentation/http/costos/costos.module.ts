import { Module } from '@nestjs/common';
import { PreciosDieselController } from './precios-diesel.controller';
import { PreciosDieselUseCase } from '../../../application/costos/precios-diesel.usecase';

/** Configuración de costos de operación (por ahora, el precio del diesel). */
@Module({
  controllers: [PreciosDieselController],
  providers: [PreciosDieselUseCase],
  exports: [PreciosDieselUseCase],
})
export class CostosModule {}
