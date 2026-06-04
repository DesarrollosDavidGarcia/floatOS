import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AusenciaConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AusenciasUseCase } from '../../../../application/conductores/expediente/ausencias.usecase';
import { CrearAusenciaDto } from './dto/crear-ausencia.dto';
import { ActualizarAusenciaDto } from './dto/actualizar-ausencia.dto';

@Controller('conductores/:conductorId/ausencias')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AusenciasController {
  constructor(private readonly ausencias: AusenciasUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearAusenciaDto,
  ): Promise<AusenciaConductor> {
    return this.ausencias.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<AusenciaConductor[]> {
    return this.ausencias.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<AusenciaConductor> {
    return this.ausencias.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarAusenciaDto,
  ): Promise<AusenciaConductor> {
    return this.ausencias.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.ausencias.eliminar(conductorId, id);
  }
}
