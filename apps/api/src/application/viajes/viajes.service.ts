import { Injectable } from '@nestjs/common';
import { CrearViajeUseCase } from './crear-viaje.usecase';
import { ListarViajesUseCase } from './listar-viajes.usecase';
import { ObtenerViajeUseCase } from './obtener-viaje.usecase';
import { EditarViajeUseCase } from './editar-viaje.usecase';
import { AsignarViajeUseCase } from './asignar-viaje.usecase';
import { CambiarEstadoViajeUseCase } from './cambiar-estado-viaje.usecase';
import { MotorViajeService } from './motor-viaje.service';
import {
  AsignarViajeInput,
  CambiarEstadoInput,
  CrearViajeInput,
  EditarViajeInput,
  EvaluarViajeInput,
  ListarViajesInput,
} from './viajes.types';

/**
 * Fachada del dominio de viajes. Orquesta los casos de uso y es el punto de
 * entrada que otros módulos (p. ej. tracking) pueden inyectar.
 */
@Injectable()
export class ViajesService {
  constructor(
    private readonly crearViaje: CrearViajeUseCase,
    private readonly listarViajes: ListarViajesUseCase,
    private readonly obtenerViaje: ObtenerViajeUseCase,
    private readonly editarViaje: EditarViajeUseCase,
    private readonly asignarViaje: AsignarViajeUseCase,
    private readonly cambiarEstadoViaje: CambiarEstadoViajeUseCase,
    private readonly motor: MotorViajeService,
  ) {}

  crear(input: CrearViajeInput, registradoPor: string) {
    return this.crearViaje.execute(input, registradoPor);
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

  asignar(id: string, input: AsignarViajeInput) {
    return this.asignarViaje.execute(id, input);
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
}
