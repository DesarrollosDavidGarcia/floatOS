import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatUseCase } from '../../../application/chat/chat.usecase';
import { TrackingModule } from '../../ws/tracking/tracking.module';

@Module({
  // TrackingModule aporta el TrackingGateway para emitir los mensajes en vivo.
  imports: [TrackingModule],
  controllers: [ChatController],
  providers: [ChatUseCase],
})
export class ChatModule {}
