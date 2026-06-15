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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CajasUseCase } from '../../../application/flota/cajas.usecase';
import { CrearCajaDto } from './dto/crear-caja.dto';
import { ActualizarCajaDto } from './dto/actualizar-caja.dto';
import { ListarCajasDto } from './dto/listar-cajas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/** CRUD de cajas / remolques (solo admin). */
@Controller('cajas')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CajasController {
  constructor(private readonly cajas: CajasUseCase) {}

  @Post()
  crear(@Body() dto: CrearCajaDto) {
    return this.cajas.crear(dto);
  }

  @Get()
  listar(@Query() query: ListarCajasDto) {
    return this.cajas.listar(query);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.cajas.obtener(id);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarCajaDto) {
    return this.cajas.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string) {
    await this.cajas.eliminar(id);
  }
}
