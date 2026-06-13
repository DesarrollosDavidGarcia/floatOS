import { Module } from '@nestjs/common';
import { ConductoresController } from './conductores.controller';
import { CrearConductorUseCase } from '../../../application/conductores/crear-conductor.usecase';
import { ListarConductoresUseCase } from '../../../application/conductores/listar-conductores.usecase';
import { ObtenerConductorUseCase } from '../../../application/conductores/obtener-conductor.usecase';
import { ActualizarConductorUseCase } from '../../../application/conductores/actualizar-conductor.usecase';
import { EliminarConductorUseCase } from '../../../application/conductores/eliminar-conductor.usecase';
import { ListarViajesConductorUseCase } from '../../../application/conductores/listar-viajes-conductor.usecase';
import { DocumentosConductorUseCase } from '../../../application/conductores/documentos-conductor.usecase';
import { ArchivosDocumentoConductorUseCase } from '../../../application/conductores/archivos-documento-conductor.usecase';
import { ArchivosExpedienteModule } from './expediente/archivos-expediente.module';

@Module({
  imports: [ArchivosExpedienteModule],
  controllers: [ConductoresController],
  providers: [
    CrearConductorUseCase,
    ListarConductoresUseCase,
    ObtenerConductorUseCase,
    ActualizarConductorUseCase,
    EliminarConductorUseCase,
    ListarViajesConductorUseCase,
    DocumentosConductorUseCase,
    ArchivosDocumentoConductorUseCase,
  ],
  exports: [
    CrearConductorUseCase,
    ObtenerConductorUseCase,
    DocumentosConductorUseCase,
  ],
})
export class ConductoresModule {}
