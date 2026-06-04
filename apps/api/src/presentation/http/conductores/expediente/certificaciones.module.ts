import { Module } from '@nestjs/common';
import { CertificacionesController } from './certificaciones.controller';
import { CertificacionesUseCase } from '../../../../application/conductores/expediente/certificaciones.usecase';

@Module({
  controllers: [CertificacionesController],
  providers: [CertificacionesUseCase],
  exports: [CertificacionesUseCase],
})
export class CertificacionesModule {}
