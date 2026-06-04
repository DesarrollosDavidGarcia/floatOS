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
import { DocumentoUnidad, Unidad } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { UnidadesUseCase } from '../../../application/flota/unidades.usecase';
import { DocumentosUnidadUseCase } from '../../../application/flota/documentos-unidad.usecase';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DiasVencimientoDto } from '../shared/dias-vencimiento.dto';
import { CrearUnidadDto } from './dto/crear-unidad.dto';
import { ActualizarUnidadDto } from './dto/actualizar-unidad.dto';
import { ListarUnidadesDto } from './dto/listar-unidades.dto';
import { CrearDocumentoUnidadDto } from './dto/crear-documento-unidad.dto';
import { ActualizarDocumentoUnidadDto } from './dto/actualizar-documento-unidad.dto';

/** Gestión administrativa de la flota: unidades y sus documentos. */
@Controller('unidades')
@UseGuards(JwtAuthGuard, AdminGuard)
export class FlotaController {
  constructor(
    private readonly unidades: UnidadesUseCase,
    private readonly documentos: DocumentosUnidadUseCase,
  ) {}

  // ── Documentos por vencer (ruta estática antes de :id) ──

  @Get('documentos/por-vencer')
  documentosPorVencer(
    @Query() query: DiasVencimientoDto,
  ): Promise<DocumentoUnidad[]> {
    return this.documentos.porVencer(query.dias);
  }

  // ── CRUD de unidades ──

  @Post()
  crearUnidad(@Body() dto: CrearUnidadDto): Promise<Unidad> {
    return this.unidades.crear(dto);
  }

  @Get()
  listarUnidades(
    @Query() query: ListarUnidadesDto,
  ): Promise<Paginado<Unidad>> {
    return this.unidades.listar(query);
  }

  @Get(':id')
  obtenerUnidad(@Param('id') id: string): Promise<Unidad> {
    return this.unidades.obtener(id);
  }

  @Patch(':id')
  actualizarUnidad(
    @Param('id') id: string,
    @Body() dto: ActualizarUnidadDto,
  ): Promise<Unidad> {
    return this.unidades.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarUnidad(@Param('id') id: string): Promise<void> {
    await this.unidades.eliminar(id);
  }

  // ── Documentos por unidad (sub-recurso) ──

  @Post(':unidadId/documentos')
  crearDocumento(
    @Param('unidadId') unidadId: string,
    @Body() dto: CrearDocumentoUnidadDto,
  ): Promise<DocumentoUnidad> {
    return this.documentos.crear(unidadId, dto);
  }

  @Get(':unidadId/documentos')
  listarDocumentos(
    @Param('unidadId') unidadId: string,
  ): Promise<DocumentoUnidad[]> {
    return this.documentos.listar(unidadId);
  }

  @Patch(':unidadId/documentos/:docId')
  actualizarDocumento(
    @Param('unidadId') unidadId: string,
    @Param('docId') docId: string,
    @Body() dto: ActualizarDocumentoUnidadDto,
  ): Promise<DocumentoUnidad> {
    return this.documentos.actualizar(unidadId, docId, dto);
  }

  @Delete(':unidadId/documentos/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarDocumento(
    @Param('unidadId') unidadId: string,
    @Param('docId') docId: string,
  ): Promise<void> {
    await this.documentos.eliminar(unidadId, docId);
  }
}
