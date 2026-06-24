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
import { CapacitacionConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CapacitacionesUseCase } from '../../../../application/conductores/expediente/capacitaciones.usecase';
import { CrearCapacitacionDto } from './dto/crear-capacitacion.dto';
import { ActualizarCapacitacionDto } from './dto/actualizar-capacitacion.dto';

@Controller('conductores/:conductorId/capacitaciones')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class CapacitacionesController {
  constructor(private readonly capacitaciones: CapacitacionesUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearCapacitacionDto,
  ): Promise<CapacitacionConductor> {
    return this.capacitaciones.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<CapacitacionConductor[]> {
    return this.capacitaciones.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<CapacitacionConductor> {
    return this.capacitaciones.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarCapacitacionDto,
  ): Promise<CapacitacionConductor> {
    return this.capacitaciones.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.capacitaciones.eliminar(conductorId, id);
  }
}
