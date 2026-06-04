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
import { CatalogoItem } from '@prisma/client';
import { CatalogoGrupoMeta } from '@flotaos/shared-types';
import { CatalogosUseCase } from '../../../application/catalogos/catalogos.usecase';
import { CrearCatalogoItemDto } from './dto/crear-catalogo-item.dto';
import { ActualizarCatalogoItemDto } from './dto/actualizar-catalogo-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('catalogos')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosUseCase) {}

  /** Metadatos de los grupos administrables. */
  @Get('grupos')
  grupos(): CatalogoGrupoMeta[] {
    return this.catalogos.listarGrupos();
  }

  /** Items de un grupo. `?soloActivos=true` para alimentar dropdowns. */
  @Get(':grupo')
  listar(
    @Param('grupo') grupo: string,
    @Query('soloActivos') soloActivos?: string,
  ): Promise<CatalogoItem[]> {
    return this.catalogos.listar(grupo, soloActivos === 'true');
  }

  @Post(':grupo')
  crear(
    @Param('grupo') grupo: string,
    @Body() dto: CrearCatalogoItemDto,
  ): Promise<CatalogoItem> {
    return this.catalogos.crear(grupo, dto);
  }

  @Patch(':grupo/:id')
  actualizar(
    @Param('grupo') grupo: string,
    @Param('id') id: string,
    @Body() dto: ActualizarCatalogoItemDto,
  ): Promise<CatalogoItem> {
    return this.catalogos.actualizar(grupo, id, dto);
  }

  @Delete(':grupo/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('grupo') grupo: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.catalogos.eliminar(grupo, id);
  }
}
