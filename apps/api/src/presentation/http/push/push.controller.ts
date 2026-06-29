import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RegistrarDispositivoUseCase } from '../../../application/push/registrar-dispositivo.usecase';
import {
  BajaDispositivoDto,
  RegistrarDispositivoDto,
} from './dto/registrar-dispositivo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthPrincipal,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

/**
 * Registro de dispositivos para push (FCM). Solo el conductor (app móvil)
 * registra/da de baja sus tokens; el panel web no recibe push.
 */
@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly dispositivos: RegistrarDispositivoUseCase) {}

  @Post('registrar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrar(
    @Body() dto: RegistrarDispositivoDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<void> {
    if (user.type !== 'conductor') {
      throw new ForbiddenException('Solo el conductor registra dispositivos.');
    }
    await this.dispositivos.registrar(user.sub, dto.token, dto.plataforma);
  }

  @Post('baja')
  @HttpCode(HttpStatus.NO_CONTENT)
  async baja(@Body() dto: BajaDispositivoDto): Promise<void> {
    await this.dispositivos.baja(dto.token);
  }
}
