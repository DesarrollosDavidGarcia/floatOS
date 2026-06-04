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
import { CertificacionConductor } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CertificacionesUseCase } from '../../../../application/conductores/expediente/certificaciones.usecase';
import { CrearCertificacionDto } from './dto/crear-certificacion.dto';
import { ActualizarCertificacionDto } from './dto/actualizar-certificacion.dto';

@Controller('conductores/:conductorId/certificaciones')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CertificacionesController {
  constructor(private readonly certificaciones: CertificacionesUseCase) {}

  @Post()
  crear(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearCertificacionDto,
  ): Promise<CertificacionConductor> {
    return this.certificaciones.crear(conductorId, dto);
  }

  @Get()
  listar(
    @Param('conductorId') conductorId: string,
  ): Promise<CertificacionConductor[]> {
    return this.certificaciones.listar(conductorId);
  }

  @Get(':id')
  obtener(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<CertificacionConductor> {
    return this.certificaciones.obtener(conductorId, id);
  }

  @Patch(':id')
  actualizar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarCertificacionDto,
  ): Promise<CertificacionConductor> {
    return this.certificaciones.actualizar(conductorId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('conductorId') conductorId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.certificaciones.eliminar(conductorId, id);
  }
}
