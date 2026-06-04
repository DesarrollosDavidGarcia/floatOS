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
import { IncidenciaConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { IncidenciasUseCase } from '../../../../application/conductores/expediente/incidencias.usecase';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { ActualizarIncidenciaDto } from './dto/actualizar-incidencia.dto';

@Controller('conductores/:conductorId/incidencias')
@UseGuards(JwtAuthGuard, AdminGuard)
export class IncidenciasController {
  constructor(private readonly incidencias: IncidenciasUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearIncidenciaDto,
  ): Promise<IncidenciaConductor> {
    return this.incidencias.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<IncidenciaConductor[]> {
    return this.incidencias.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<IncidenciaConductor> {
    return this.incidencias.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarIncidenciaDto,
  ): Promise<IncidenciaConductor> {
    return this.incidencias.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.incidencias.eliminar(conductorId, id);
  }
}
