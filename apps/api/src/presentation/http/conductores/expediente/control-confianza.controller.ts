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
import { ControlConfianzaConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { ControlConfianzaUseCase } from '../../../../application/conductores/expediente/control-confianza.usecase';
import { CrearControlConfianzaDto } from './dto/crear-control-confianza.dto';
import { ActualizarControlConfianzaDto } from './dto/actualizar-control-confianza.dto';

@Controller('conductores/:conductorId/control-confianza')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ControlConfianzaController {
  constructor(private readonly controlConfianza: ControlConfianzaUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearControlConfianzaDto,
  ): Promise<ControlConfianzaConductor> {
    return this.controlConfianza.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<ControlConfianzaConductor[]> {
    return this.controlConfianza.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<ControlConfianzaConductor> {
    return this.controlConfianza.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarControlConfianzaDto,
  ): Promise<ControlConfianzaConductor> {
    return this.controlConfianza.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.controlConfianza.eliminar(conductorId, id);
  }
}
