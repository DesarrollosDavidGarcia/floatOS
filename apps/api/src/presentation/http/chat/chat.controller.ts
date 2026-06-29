import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MensajeChatPayload } from '@flotaos/shared-types';
import {
  ArchivoSubido,
  ChatUseCase,
  CHAT_TAMANO_MAX_BYTES,
  NoLeidosResumen,
} from '../../../application/chat/chat.usecase';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { ListarChatQueryDto } from './dto/listar-chat.query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthPrincipal,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

/**
 * Chat por viaje. Accesible a admins (cualquier rol) y al conductor dueño del
 * viaje; la autorización por viaje la resuelve el caso de uso. Solo requiere
 * estar autenticado (no AdminGuard, porque también participa el conductor).
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatUseCase) {}

  /** Resumen de mensajes no leídos del principal (para la campana/badge). */
  @Get('chat/no-leidos')
  noLeidos(@CurrentUser() user: AuthPrincipal): Promise<NoLeidosResumen> {
    return this.chat.noLeidos(user);
  }

  /**
   * Historial del chat de un viaje, paginado por cursor sobre `createdAt`.
   *
   * Contrato (compatible hacia atrás): el CUERPO sigue siendo el array de
   * mensajes en orden cronológico ascendente. La metadata de paginación viaja
   * en cabeceras de respuesta para no romper a clientes que esperan un array:
   *   - `X-Chat-Has-More`: "true" | "false" (hay mensajes más antiguos).
   *   - `X-Chat-Next-Cursor`: id del mensaje más viejo de la página (o ausente).
   *
   * Query params opcionales:
   *   - `limit`: tamaño de página (1..100, por defecto 40).
   *   - `cursor`: id del mensaje más antiguo ya cargado; pide la página anterior.
   * Sin parámetros => primera página (los mensajes más recientes).
   */
  @Get('viajes/:viajeId/chat')
  async listar(
    @Param('viajeId') viajeId: string,
    @Query() query: ListarChatQueryDto,
    @CurrentUser() user: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MensajeChatPayload[]> {
    const { mensajes, hayMas, siguienteCursor } = await this.chat.listar(
      viajeId,
      user,
      { limit: query.limit, cursor: query.cursor },
    );
    res.setHeader('X-Chat-Has-More', hayMas ? 'true' : 'false');
    res.setHeader('Access-Control-Expose-Headers', [
      'X-Chat-Has-More',
      'X-Chat-Next-Cursor',
    ]);
    if (siguienteCursor) {
      res.setHeader('X-Chat-Next-Cursor', siguienteCursor);
    }
    return mensajes;
  }

  /** Envía un mensaje (texto y/o un adjunto imagen/PDF, campo `archivo`). */
  @Post('viajes/:viajeId/chat')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: CHAT_TAMANO_MAX_BYTES } }),
  )
  enviar(
    @Param('viajeId') viajeId: string,
    @Body() dto: EnviarMensajeDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<MensajeChatPayload> {
    return this.chat.enviar(viajeId, user, dto.texto, archivo);
  }

  /** Marca como leídos los mensajes del otro lado en este viaje. */
  @Post('viajes/:viajeId/chat/leer')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarLeido(
    @Param('viajeId') viajeId: string,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<void> {
    return this.chat.marcarLeido(viajeId, user);
  }

  /**
   * Marca como recibidos (entregados) los mensajes del otro lado. Lo llama el
   * cliente del destinatario al recibir un mensaje por socket, aunque no tenga
   * el chat abierto (para la palomita doble "entregado").
   */
  @Post('viajes/:viajeId/chat/recibido')
  @HttpCode(HttpStatus.NO_CONTENT)
  marcarRecibido(
    @Param('viajeId') viajeId: string,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<void> {
    return this.chat.marcarRecibido(viajeId, user);
  }
}
