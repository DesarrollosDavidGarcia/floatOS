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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DocumentoConductor } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { PaginacionDto } from '../shared/paginacion.dto';
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
import {
  ArchivosDocumentoConductorUseCase,
  ArchivoSubido,
  TAMANO_MAX_BYTES,
} from '../../../application/conductores/archivos-documento-conductor.usecase';
import { ArchivosExpedienteUseCase } from '../../../application/conductores/archivos-expediente.usecase';
import { ConductorPublico } from '../../../application/conductores/conductores.types';
import { CrearConductorDto } from './dto/crear-conductor.dto';
import { ActualizarConductorDto } from './dto/actualizar-conductor.dto';
import { ListarConductoresDto } from './dto/listar-conductores.dto';
import { CrearDocumentoConductorDto } from './dto/crear-documento-conductor.dto';
import { ActualizarDocumentoConductorDto } from './dto/actualizar-documento-conductor.dto';
import { DiasVencimientoDto } from '../shared/dias-vencimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
    private readonly archivosDocumento: ArchivosDocumentoConductorUseCase,
    private readonly archivosExpediente: ArchivosExpedienteUseCase,
  ) {}

  // ─────────────────────────── Conductores ───────────────────────────

  @Post()
  @Roles('ADMIN')
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
  @Roles('ADMIN')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarConductorDto,
  ): Promise<ConductorPublico> {
    return this.actualizarConductor.execute(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string): Promise<void> {
    return this.eliminarConductor.execute(id);
  }

  @Get(':id/viajes')
  viajes(
    @Param('id') id: string,
    @Query() paginacion: PaginacionDto,
  ): Promise<Paginado<unknown>> {
    return this.listarViajesConductor.execute(
      id,
      paginacion.page,
      paginacion.pageSize,
    );
  }

  // ─────────────────── Documentos de un conductor ────────────────────

  @Post(':conductorId/documentos')
  @Roles('ADMIN')
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
  @Roles('ADMIN')
  actualizarDocumento(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
    @Body() dto: ActualizarDocumentoConductorDto,
  ): Promise<DocumentoConductor> {
    return this.documentos.actualizar(conductorId, docId, dto);
  }

  @Delete(':conductorId/documentos/:docId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminarDocumento(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
  ): Promise<void> {
    return this.documentos.eliminar(conductorId, docId);
  }

  // ──────────── Archivos adjuntos de un documento (PDF/imagen) ────────────

  /** Sube uno o varios archivos (PDF o imagen) a un documento del conductor. */
  @Post(':conductorId/documentos/:docId/archivos')
  @Roles('ADMIN')
  @UseInterceptors(
    FilesInterceptor('archivos', 10, { limits: { fileSize: TAMANO_MAX_BYTES } }),
  )
  subirArchivos(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
    @UploadedFiles() archivos: ArchivoSubido[],
  ) {
    return this.archivosDocumento.subir(conductorId, docId, archivos ?? []);
  }

  @Get(':conductorId/documentos/:docId/archivos')
  listarArchivos(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
  ) {
    return this.archivosDocumento.listar(conductorId, docId);
  }

  @Get(':conductorId/documentos/:docId/archivos/:archivoId/url')
  urlArchivo(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
    @Param('archivoId') archivoId: string,
  ) {
    return this.archivosDocumento.urlDescarga(conductorId, docId, archivoId);
  }

  @Delete(':conductorId/documentos/:docId/archivos/:archivoId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarArchivo(
    @Param('conductorId') conductorId: string,
    @Param('docId') docId: string,
    @Param('archivoId') archivoId: string,
  ): Promise<void> {
    await this.archivosDocumento.eliminar(conductorId, docId, archivoId);
  }

  // ───── Archivos de evidencia de las secciones del expediente (PDF/imagen) ─────
  // `:seccion` es el slug de la sección (examenes-medicos, certificaciones,
  // capacitaciones, control-confianza, incidencias, evaluaciones); N por registro.

  /** Conteo de archivos por registro de una sección (para el badge del listado). */
  @Get(':conductorId/expediente/:seccion/archivos/conteos')
  conteosArchivosExpediente(
    @Param('conductorId') conductorId: string,
    @Param('seccion') seccion: string,
  ): Promise<Record<string, number>> {
    return this.archivosExpediente.conteos(
      conductorId,
      this.archivosExpediente.resolverSeccion(seccion),
    );
  }

  /** Sube uno o varios archivos (PDF o imagen) a un registro del expediente. */
  @Post(':conductorId/expediente/:seccion/:registroId/archivos')
  @Roles('ADMIN')
  @UseInterceptors(
    FilesInterceptor('archivos', 10, { limits: { fileSize: TAMANO_MAX_BYTES } }),
  )
  subirArchivosExpediente(
    @Param('conductorId') conductorId: string,
    @Param('seccion') seccion: string,
    @Param('registroId') registroId: string,
    @UploadedFiles() archivos: ArchivoSubido[],
  ) {
    return this.archivosExpediente.subir(
      conductorId,
      this.archivosExpediente.resolverSeccion(seccion),
      registroId,
      archivos ?? [],
    );
  }

  @Get(':conductorId/expediente/:seccion/:registroId/archivos')
  listarArchivosExpediente(
    @Param('conductorId') conductorId: string,
    @Param('seccion') seccion: string,
    @Param('registroId') registroId: string,
  ) {
    return this.archivosExpediente.listar(
      conductorId,
      this.archivosExpediente.resolverSeccion(seccion),
      registroId,
    );
  }

  @Get(':conductorId/expediente/:seccion/:registroId/archivos/:archivoId/url')
  urlArchivoExpediente(
    @Param('conductorId') conductorId: string,
    @Param('seccion') seccion: string,
    @Param('registroId') registroId: string,
    @Param('archivoId') archivoId: string,
  ) {
    return this.archivosExpediente.urlDescarga(
      conductorId,
      this.archivosExpediente.resolverSeccion(seccion),
      registroId,
      archivoId,
    );
  }

  @Delete(':conductorId/expediente/:seccion/:registroId/archivos/:archivoId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarArchivoExpediente(
    @Param('conductorId') conductorId: string,
    @Param('seccion') seccion: string,
    @Param('registroId') registroId: string,
    @Param('archivoId') archivoId: string,
  ): Promise<void> {
    await this.archivosExpediente.eliminar(
      conductorId,
      this.archivosExpediente.resolverSeccion(seccion),
      registroId,
      archivoId,
    );
  }
}
