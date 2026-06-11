import { Module } from '@nestjs/common';
import { CapacitacionesController } from './capacitaciones.controller';
import { CapacitacionesUseCase } from '../../../../application/conductores/expediente/capacitaciones.usecase';
import { ArchivosExpedienteModule } from './archivos-expediente.module';

@Module({
  imports: [ArchivosExpedienteModule],
  controllers: [CapacitacionesController],
  providers: [CapacitacionesUseCase],
})
export class CapacitacionesModule {}
