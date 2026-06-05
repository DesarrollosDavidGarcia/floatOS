import { Module } from '@nestjs/common';
import { FlotaController } from './flota.controller';
import { UnidadesUseCase } from '../../../application/flota/unidades.usecase';
import { DocumentosUnidadUseCase } from '../../../application/flota/documentos-unidad.usecase';
import { ArchivosUnidadUseCase } from '../../../application/flota/archivos-unidad.usecase';

/**
 * Módulo FLOTA (módulo 2 del MVP): CRUD de unidades y sus documentos.
 * PrismaModule es @Global, por lo que no se importa aquí.
 */
@Module({
  controllers: [FlotaController],
  providers: [UnidadesUseCase, DocumentosUnidadUseCase, ArchivosUnidadUseCase],
  exports: [UnidadesUseCase, DocumentosUnidadUseCase],
})
export class FlotaModule {}
