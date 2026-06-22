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
import { EventoLaboralConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EventosLaboralesUseCase } from '../../../../application/conductores/expediente/eventos-laborales.usecase';
import { CrearEventoLaboralDto } from './dto/crear-evento-laboral.dto';
import { ActualizarEventoLaboralDto } from './dto/actualizar-evento-laboral.dto';

@Controller('conductores/:conductorId/eventos-laborales')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class EventosLaboralesController {
  constructor(private readonly eventosLaborales: EventosLaboralesUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearEventoLaboralDto,
  ): Promise<EventoLaboralConductor> {
    return this.eventosLaborales.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<EventoLaboralConductor[]> {
    return this.eventosLaborales.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<EventoLaboralConductor> {
    return this.eventosLaborales.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarEventoLaboralDto,
  ): Promise<EventoLaboralConductor> {
    return this.eventosLaborales.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.eventosLaborales.eliminar(conductorId, id);
  }
}
