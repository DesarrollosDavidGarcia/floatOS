import { Injectable } from '@nestjs/common';
import { CrearViajeUseCase } from './crear-viaje.usecase';
import { DuplicarViajeUseCase } from './duplicar-viaje.usecase';
import { ListarViajesUseCase } from './listar-viajes.usecase';
import { ObtenerViajeUseCase } from './obtener-viaje.usecase';
import { EditarViajeUseCase } from './editar-viaje.usecase';
import { AsignarViajeUseCase } from './asignar-viaje.usecase';
import { CambiarEstadoViajeUseCase } from './cambiar-estado-viaje.usecase';
import { ActualizarPlanRutaUseCase } from './actualizar-plan-ruta.usecase';
import {
  ContactoEscalaInput,
  GestionarContactosEscalaUseCase,
} from './gestionar-contactos-escala.usecase';
import { ListarLlegadasRecientesUseCase } from './listar-llegadas-recientes.usecase';
import {
  ReportarIncidenciaInput,
  ReportarIncidenciaViajeUseCase,
} from './reportar-incidencia-viaje.usecase';
import { MotorViajeService } from './motor-viaje.service';
import {
  AsignarViajeInput,
  CambiarEstadoInput,
  CrearViajeInput,
  EditarViajeInput,
  EvaluarViajeInput,
  ListarViajesInput,
  PlanRutaInput,
} from './viajes.types';

/**
 * Fachada del dominio de viajes. Orquesta los casos de uso y es el punto de
 * entrada que otros módulos (p. ej. tracking) pueden inyectar.
 */
@Injectable()
export class ViajesService {
  constructor(
    private readonly crearViaje: CrearViajeUseCase,
    private readonly duplicarViaje: DuplicarViajeUseCase,
    private readonly listarViajes: ListarViajesUseCase,
    private readonly obtenerViaje: ObtenerViajeUseCase,
    private readonly editarViaje: EditarViajeUseCase,
    private readonly asignarViaje: AsignarViajeUseCase,
    private readonly cambiarEstadoViaje: CambiarEstadoViajeUseCase,
    private readonly actualizarPlanRuta: ActualizarPlanRutaUseCase,
    private readonly gestionarContactos: GestionarContactosEscalaUseCase,
    private readonly listarLlegadas: ListarLlegadasRecientesUseCase,
    private readonly reportarIncidenciaUC: ReportarIncidenciaViajeUseCase,
    private readonly motor: MotorViajeService,
  ) {}

  crear(input: CrearViajeInput, registradoPor: string) {
    return this.crearViaje.execute(input, registradoPor);
  }

  /** Duplica un viaje (itinerario + cliente + fecha + plan; sin asignación). */
  duplicar(id: string, registradoPor: string) {
    return this.duplicarViaje.execute(id, registradoPor);
  }

  /** Motor de cálculo: evalúa un itinerario contra la flota. */
  evaluar(input: EvaluarViajeInput) {
    return this.motor.evaluar(input);
  }

  listar(filtros: ListarViajesInput) {
    return this.listarViajes.execute(filtros);
  }

  obtener(id: string) {
    return this.obtenerViaje.execute(id);
  }

  /** Detalle restringido: el conductor solo puede ver sus propios viajes. */
  obtenerComoConductor(id: string, conductorId: string) {
    return this.obtenerViaje.execute(id, conductorId);
  }

  historial(id: string, conductorId?: string) {
    return this.obtenerViaje.historial(id, conductorId);
  }

  editar(id: string, input: EditarViajeInput) {
    return this.editarViaje.execute(id, input);
  }

  asignar(id: string, input: AsignarViajeInput, registradoPor?: string) {
    return this.asignarViaje.execute(id, input, registradoPor);
  }

  /** Guarda el plan multi-día del viaje (planeación de la llegada estimada). */
  actualizarPlan(id: string, input: PlanRutaInput) {
    return this.actualizarPlanRuta.execute(id, input);
  }

  cambiarEstado(
    id: string,
    input: CambiarEstadoInput,
    registradoPor: string,
    conductorId?: string,
  ) {
    return this.cambiarEstadoViaje.execute(
      id,
      input,
      registradoPor,
      conductorId,
    );
  }

  /** Reanuda un viaje VARADO al estado en que estaba antes de la incidencia. */
  reanudar(id: string, registradoPor: string, conductorId?: string) {
    return this.cambiarEstadoViaje.reanudar(id, registradoPor, conductorId);
  }

  /** El conductor (o admin) reporta una incidencia operativa de un viaje. */
  reportarIncidencia(
    viajeId: string,
    input: ReportarIncidenciaInput,
    registradoPor: string,
    conductorId?: string,
  ) {
    return this.reportarIncidenciaUC.execute(
      viajeId,
      input,
      registradoPor,
      conductorId,
    );
  }

  /**
   * Reemplaza las personas a cargo (gente que recibe el aviso de llegada) de una
   * escala. Requiere que el viaje tenga una cotización aceptada.
   */
  gestionarContactosEscala(
    viajeId: string,
    escalaId: string,
    contactos: ContactoEscalaInput[],
  ) {
    return this.gestionarContactos.execute(viajeId, escalaId, contactos);
  }

  /** Historial reciente de llegadas (geocercas) para la campana del panel. */
  llegadasRecientes() {
    return this.listarLlegadas.execute();
  }
}
