import { Module } from '@nestjs/common';
import { RoutingModule } from '../../../infrastructure/routing/routing.module';
import { BotController } from './bot.controller';
import { BotCotizacionService } from './bot-cotizacion.service';

/**
 * Superficie HTTP para el bot de cotización (n8n), autenticada por API key.
 * Reúsa el ruteo/geocodificación (RoutingModule) y el motor de cotización; el
 * acceso a empresa va por PrismaService (módulo @Global).
 */
@Module({
  imports: [RoutingModule],
  controllers: [BotController],
  providers: [BotCotizacionService],
})
export class BotModule {}
