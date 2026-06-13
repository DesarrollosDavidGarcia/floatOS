import { Module } from '@nestjs/common';
import { ControlConfianzaController } from './control-confianza.controller';
import { ControlConfianzaUseCase } from '../../../../application/conductores/expediente/control-confianza.usecase';
import { ArchivosExpedienteModule } from './archivos-expediente.module';

@Module({
  imports: [ArchivosExpedienteModule],
  controllers: [ControlConfianzaController],
  providers: [ControlConfianzaUseCase],
})
export class ControlConfianzaModule {}
