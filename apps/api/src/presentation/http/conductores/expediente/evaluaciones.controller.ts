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
import { EvaluacionDesempenoConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EvaluacionesUseCase } from '../../../../application/conductores/expediente/evaluaciones.usecase';
import { CrearEvaluacionDto } from './dto/crear-evaluacion.dto';
import { ActualizarEvaluacionDto } from './dto/actualizar-evaluacion.dto';

@Controller('conductores/:conductorId/evaluaciones')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class EvaluacionesController {
  constructor(private readonly evaluaciones: EvaluacionesUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearEvaluacionDto,
  ): Promise<EvaluacionDesempenoConductor> {
    return this.evaluaciones.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<EvaluacionDesempenoConductor[]> {
    return this.evaluaciones.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<EvaluacionDesempenoConductor> {
    return this.evaluaciones.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarEvaluacionDto,
  ): Promise<EvaluacionDesempenoConductor> {
    return this.evaluaciones.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.evaluaciones.eliminar(conductorId, id);
  }
}
