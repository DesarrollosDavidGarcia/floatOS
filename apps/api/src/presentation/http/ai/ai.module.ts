import { Module } from '@nestjs/common';
import { AiModule } from '../../../infrastructure/ai/ai.module';
import { AiController } from './ai.controller';

/** Endpoints HTTP de IA (extracción de documentos del expediente). */
@Module({
  imports: [AiModule],
  controllers: [AiController],
})
export class AiHttpModule {}
