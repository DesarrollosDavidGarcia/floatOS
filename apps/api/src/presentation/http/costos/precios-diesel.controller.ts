import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrecioDiesel } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PreciosDieselUseCase } from '../../../application/costos/precios-diesel.usecase';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginacionDto } from '../shared/paginacion.dto';
import { CrearPrecioDieselDto } from './dto/crear-precio-diesel.dto';
import { ActualizarPrecioDieselDto } from './dto/actualizar-precio-diesel.dto';

/**
 * Precio del diesel con vigencia. Es configuración de costos de la empresa, así
 * que solo ADMIN: el monitorista no fija cuánto cuesta operar.
 */
@Controller('precios-diesel')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class PreciosDieselController {
  constructor(private readonly precios: PreciosDieselUseCase) {}

  @Post()
  crear(@Body() dto: CrearPrecioDieselDto): Promise<PrecioDiesel> {
    return this.precios.crear(dto);
  }

  @Get()
  listar(@Query() query: PaginacionDto): Promise<Paginado<PrecioDiesel>> {
    return this.precios.listar(query);
  }

  /** Precio aplicable hoy (o en la fecha indicada), para mostrar el vigente. */
  @Get('vigente')
  vigente(@Query('fecha') fecha?: string): Promise<PrecioDiesel | null> {
    const cuando = fecha ? new Date(fecha) : new Date();
    return this.precios.vigenteEn(cuando);
  }

  @Get(':id')
  obtener(@Param('id') id: string): Promise<PrecioDiesel> {
    return this.precios.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarPrecioDieselDto,
  ): Promise<PrecioDiesel> {
    return this.precios.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string): Promise<{ id: string }> {
    return this.precios.eliminar(id);
  }
}
