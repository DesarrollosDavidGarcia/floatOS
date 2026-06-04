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
import { DocumentoConductor, Viaje } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { CrearConductorUseCase } from '../../../application/conductores/crear-conductor.usecase';
import { ListarConductoresUseCase } from '../../../application/conductores/listar-conductores.usecase';
import { ObtenerConductorUseCase } from '../../../application/conductores/obtener-conductor.usecase';
import { ActualizarConductorUseCase } from '../../../application/conductores/actualizar-conductor.usecase';
import { EliminarConductorUseCase } from '../../../application/conductores/eliminar-conductor.usecase';
import { ListarViajesConductorUseCase } from '../../../application/conductores/listar-viajes-conductor.usecase';
import {
  DocumentosConductorUseCase,
  DocumentoConductorPorVencer,
} from '../../../application/conductores/documentos-conductor.usecase';
import { ConductorPublico } from '../../../application/conductores/conductores.types';
import { CrearConductorDto } from './dto/crear-conductor.dto';
import { ActualizarConductorDto } from './dto/actualizar-conductor.dto';
import { ListarConductoresDto } from './dto/listar-conductores.dto';
import { CrearDocumentoConductorDto } from './dto/crear-documento-conductor.dto';
import { ActualizarDocumentoConductorDto } from './dto/actualizar-documento-conductor.dto';
import { DiasVencimientoDto } from '../shared/dias-vencimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('conductores')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ConductoresController {
  constructor(
    private readonly crearConductor: CrearConductorUseCase,
    private readonly listarConductores: ListarConductoresUseCase,
    private readonly obtenerConductor: ObtenerConductorUseCase,
    private readonly actualizarConductor: ActualizarConductorUseCase,
    private readonly eliminarConductor: EliminarConductorUseCase,
    private readonly listarViajesConductor: ListarViajesConductorUseCase,
    private readonly documentos: DocumentosConductorUseCase,
  ) {}

  // ─────────────────────────── Conductores ───────────────────────────

  @Post()
  crear(@Body() dto: CrearConductorDto): Promise<ConductorPublico> {
    return this.crearConductor.execute(dto);
  }

  @Get()
  listar(
    @Query() query: ListarConductoresDto,
  ): Promise<Paginado<ConductorPublico>> {
    return this.listarConductores.execute(query);
  }

  // Documentos por vencer (global). Declarado antes de las rutas con :id
  // para que 'documentos' no se interprete como un id de conductor.
  @Get('documentos/por-vencer')
  documentosPorVencer(
    @Query() query: DiasVencimientoDto,
  ): Promise<DocumentoConductorPorVencer[]> {
    return this.documentos.porVencer(query.dias);
  }

  @Get(':id')
  obtener(@Param('id') id: string): Promise<ConductorPublico> {
    return this.obtenerConductor.execute(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarConductorDto,
  ): Promise<ConductorPublico> {
    return this.actualizarConductor.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string): Promise<void> {
    return this.eliminarConductor.execute(id);
  }

  @Get(':id/viajes')
  viajes(@Param('id') id: string): Promise<Viaje[]> {
    return this.listarViajesConductor.execute(id);
  }

  // ─────────────────── Documentos de un conductor ────────────────────

  @Post(':conductorId/documentos')
  crearDocumento(
    @Param('conductorId') conductorId: string,
    @Body() dto: CrearDocumentoConductorDto,
  ): Promise<DocumentoConductor> {
    return this.documentos.crear(conductorId, dto);
  }

  @Get(':conductorId/documentos')
  listarDocumentos(
    @Param('conductorId') conductorId: string,
  ): Promise<DocumentoConductor[]> {
    return this.documentos.listar(conductorId);
  }

  @Get(':conductorId/documentos/:docId')
  obtenerDocumento(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
  ): Promise<DocumentoConductor> {
    return this.documentos.obtener(conductorId, docId);
  }

  @Patch(':conductorId/documentos/:docId')
  actualizarDocumento(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
    @Body() dto: ActualizarDocumentoConductorDto,
  ): Promise<DocumentoConductor> {
    return this.documentos.actualizar(conductorId, docId, dto);
  }

  @Delete(':conductorId/documentos/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminarDocumento(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
  ): Promise<void> {
    return this.documentos.eliminar(conductorId, docId);
  }
}
