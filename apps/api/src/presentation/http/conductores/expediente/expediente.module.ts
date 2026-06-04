import { Module } from '@nestjs/common';
import { ExamenesMedicosModule } from './examenes-medicos.module';
import { CertificacionesModule } from './certificaciones.module';
import { CapacitacionesModule } from './capacitaciones.module';
import { IncidenciasModule } from './incidencias.module';
import { EventosLaboralesModule } from './eventos-laborales.module';
import { AptitudesUnidadModule } from './aptitudes-unidad.module';
import { ControlConfianzaModule } from './control-confianza.module';
import { EvaluacionesModule } from './evaluaciones.module';
import { AusenciasModule } from './ausencias.module';

/**
 * Agrupa las secciones del expediente del conductor. Cada sección es un módulo
 * independiente con su propio controller (rutas `conductores/:conductorId/...`)
 * y caso de uso. Documentación y Datos/RH viven en ConductoresModule.
 */
@Module({
  imports: [
    ExamenesMedicosModule,
    CertificacionesModule,
    CapacitacionesModule,
    IncidenciasModule,
    EventosLaboralesModule,
    AptitudesUnidadModule,
    ControlConfianzaModule,
    EvaluacionesModule,
    AusenciasModule,
  ],
})
export class ExpedienteModule {}
