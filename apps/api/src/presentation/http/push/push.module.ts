import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { RegistrarDispositivoUseCase } from '../../../application/push/registrar-dispositivo.usecase';

/** Endpoints de registro/baja de tokens FCM del conductor. */
@Module({
  controllers: [PushController],
  providers: [RegistrarDispositivoUseCase],
})
export class PushHttpModule {}
