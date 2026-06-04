import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RegistrarUbicacionUseCase } from '../../../application/tracking/registrar-ubicacion.usecase';
import { UbicacionPublica } from '../../../application/tracking/tracking.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConductorGuard } from '../auth/guards/conductor.guard';
import {
  AuthPrincipal,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { RegistrarUbicacionDto } from './dto/registrar-ubicacion.dto';
import { RegistrarUbicacionesLoteDto } from './dto/registrar-ubicaciones-lote.dto';

/**
 * Ingesta de ubicaciones del conductor.
 * Protegido: sólo el conductor autenticado dueño del viaje puede reportar.
 */
@Controller('viajes')
@UseGuards(JwtAuthGuard, ConductorGuard)
@SkipThrottle()
export class UbicacionController {
  constructor(
    private readonly registrarUbicacion: RegistrarUbicacionUseCase,
  ) {}

  /** Reporta un único punto de ubicación. */
  @Post(':viajeId/ubicacion')
  @HttpCode(HttpStatus.CREATED)
  registrar(
    @Param('viajeId') viajeId: string,
    @Body() dto: RegistrarUbicacionDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<UbicacionPublica> {
    return this.registrarUbicacion.execute(viajeId, user.sub, dto);
  }

  /** Reporta un lote de puntos (sincronización offline). */
  @Post(':viajeId/ubicaciones')
  @HttpCode(HttpStatus.CREATED)
  registrarLote(
    @Param('viajeId') viajeId: string,
    @Body() dto: RegistrarUbicacionesLoteDto,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<UbicacionPublica[]> {
    return this.registrarUbicacion.executeBatch(viajeId, user.sub, dto.puntos);
  }
}
