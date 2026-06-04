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
import { AptitudUnidadConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AptitudesUnidadUseCase } from '../../../../application/conductores/expediente/aptitudes-unidad.usecase';
import { CrearAptitudUnidadDto } from './dto/crear-aptitud-unidad.dto';
import { ActualizarAptitudUnidadDto } from './dto/actualizar-aptitud-unidad.dto';

@Controller('conductores/:conductorId/aptitudes-unidad')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AptitudesUnidadController {
  constructor(private readonly aptitudesUnidad: AptitudesUnidadUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearAptitudUnidadDto,
  ): Promise<AptitudUnidadConductor> {
    return this.aptitudesUnidad.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<AptitudUnidadConductor[]> {
    return this.aptitudesUnidad.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<AptitudUnidadConductor> {
    return this.aptitudesUnidad.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarAptitudUnidadDto,
  ): Promise<AptitudUnidadConductor> {
    return this.aptitudesUnidad.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.aptitudesUnidad.eliminar(conductorId, id);
  }
}
