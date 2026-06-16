import { Module } from '@nestjs/common';
import { FlotaController } from './flota.controller';
import { CajasController } from './cajas.controller';
import { UnidadesUseCase } from '../../../application/flota/unidades.usecase';
import { CajasUseCase } from '../../../application/flota/cajas.usecase';
import { DocumentosUnidadUseCase } from '../../../application/flota/documentos-unidad.usecase';
import { ArchivosUnidadUseCase } from '../../../application/flota/archivos-unidad.usecase';

/**
 * Módulo FLOTA (módulo 2 del MVP): CRUD de unidades (tractores), cajas/remolques
 * y los documentos de unidad. PrismaModule es @Global, no se importa aquí.
 */
@Module({
  controllers: [FlotaController, CajasController],
  providers: [
    UnidadesUseCase,
    CajasUseCase,
    DocumentosUnidadUseCase,
    ArchivosUnidadUseCase,
  ],
  exports: [UnidadesUseCase, DocumentosUnidadUseCase],
})
export class FlotaModule {}
