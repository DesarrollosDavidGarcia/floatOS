import { Global, Module } from '@nestjs/common';
import { PushService } from './push.service';

/** Acceso global al envío de notificaciones push (FCM). */
@Global()
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
