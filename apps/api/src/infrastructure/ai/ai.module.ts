import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

/**
 * Módulo de IA generativa (proveedor compatible con OpenAI, p. ej. Novita).
 * Exporta `AiService` para que lo consuman los módulos de presentación.
 */
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
