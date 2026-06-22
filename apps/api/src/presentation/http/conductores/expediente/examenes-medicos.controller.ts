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
import { ExamenMedicoConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ExamenesMedicosUseCase } from '../../../../application/conductores/expediente/examenes-medicos.usecase';
import { CrearExamenMedicoDto } from './dto/crear-examen-medico.dto';
import { ActualizarExamenMedicoDto } from './dto/actualizar-examen-medico.dto';

@Controller('conductores/:conductorId/examenes-medicos')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class ExamenesMedicosController {
  constructor(private readonly examenesMedicos: ExamenesMedicosUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearExamenMedicoDto,
  ): Promise<ExamenMedicoConductor> {
    return this.examenesMedicos.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<ExamenMedicoConductor[]> {
    return this.examenesMedicos.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<ExamenMedicoConductor> {
    return this.examenesMedicos.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarExamenMedicoDto,
  ): Promise<ExamenMedicoConductor> {
    return this.examenesMedicos.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.examenesMedicos.eliminar(conductorId, id);
  }
}
