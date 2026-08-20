import { BadRequestException, Injectable } from '@nestjs/common';
import { OrigenRevision, TipoRevisionViaje } from '@prisma/client';
import { AuthPrincipal } from '../../presentation/http/auth/decorators/current-user.decorator';
import {
  ArchivoSubido,
  TAMANO_MAX_BYTES,
} from '../flota/archivos-unidad.usecase';
import { validarFirmaArchivo } from '../shared/validar-archivo';

/** Imágenes aceptadas como evidencia de campo (tablero y tickets). */
const IMAGENES_PERMITIDAS: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Valida una foto de campo. Además del mimetype declarado —que el cliente puede
 * falsificar— se comprueba la firma real de bytes, igual que en los adjuntos de
 * la flota.
 */
function validarImagen(archivo: ArchivoSubido): void {
  if (!IMAGENES_PERMITIDAS.has(archivo.mimetype)) {
    throw new BadRequestException('La evidencia debe ser una imagen JPG, PNG o WEBP');
  }
  validarFirmaArchivo(archivo.buffer, archivo.mimetype);
  if (archivo.size > TAMANO_MAX_BYTES) {
    throw new BadRequestException('La imagen supera el tamaño máximo de 10 MB');
  }
}

/** El tipo llega por URL: se valida contra el enum antes de tocar la base. */
function tipoRevisionValido(tipo: string): TipoRevisionViaje {
  const normalizado = tipo.toUpperCase();
  if (normalizado !== 'SALIDA' && normalizado !== 'LLEGADA') {
    throw new BadRequestException('La revisión debe ser de tipo SALIDA o LLEGADA');
  }
  return normalizado as TipoRevisionViaje;
}

/**
 * Id del conductor solo cuando quien pide es un conductor: los casos de uso lo
 * usan para exigir que el viaje sea suyo. Desde el panel va undefined.
 */
function idSiEsConductor(user: AuthPrincipal): string | undefined {
  return user.type === 'conductor' ? user.sub : undefined;
}
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
import {
  GestionarPasajerosUseCase,
  PasajeroViajeInput,
} from './gestionar-pasajeros.usecase';
import { ListarLlegadasRecientesUseCase } from './listar-llegadas-recientes.usecase';
import {
  ReportarIncidenciaInput,
  ReportarIncidenciaViajeUseCase,
} from './reportar-incidencia-viaje.usecase';
import { MargenViajeUseCase } from './margen-viaje.usecase';
import {
  CapturarRevisionInput,
  RevisionesViajeUseCase,
} from './revisiones-viaje.usecase';
import { CrearGastoInput, GastosViajeUseCase } from './gastos-viaje.usecase';
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
    private readonly gestionarPasajerosUC: GestionarPasajerosUseCase,
    private readonly listarLlegadas: ListarLlegadasRecientesUseCase,
    private readonly reportarIncidenciaUC: ReportarIncidenciaViajeUseCase,
    private readonly motor: MotorViajeService,
    private readonly margenViaje: MargenViajeUseCase,
    private readonly revisionesViaje: RevisionesViajeUseCase,
    private readonly gastosViaje: GastosViajeUseCase,
  ) {}

  revisiones(viajeId: string) {
    return this.revisionesViaje.listar(viajeId);
  }

  /**
   * Captura la revisión del vehículo. El origen sale de quién la manda: el
   * conductor es la fuente de primera mano y el panel queda registrado como
   * MONITORISTA, que es la excepción para cuando el conductor no pudo.
   */
  capturarRevision(
    viajeId: string,
    tipo: string,
    input: CapturarRevisionInput,
    user: AuthPrincipal,
  ) {
    const tipoRevision = tipoRevisionValido(tipo);
    const esConductor = user.type === 'conductor';
    return this.revisionesViaje.capturar(
      viajeId,
      tipoRevision,
      input,
      user.sub,
      esConductor ? OrigenRevision.CONDUCTOR : OrigenRevision.MONITORISTA,
      esConductor ? user.sub : undefined,
    );
  }

  fotoRevision(revisionId: string, foto?: ArchivoSubido) {
    if (!foto) {
      throw new BadRequestException('No se recibió ninguna foto');
    }
    validarImagen(foto);
    return this.revisionesViaje.guardarFotoTablero(revisionId, foto);
  }

  gastos(viajeId: string, user: AuthPrincipal) {
    return this.gastosViaje.listar(viajeId, idSiEsConductor(user));
  }

  crearGasto(viajeId: string, input: CrearGastoInput, user: AuthPrincipal) {
    return this.gastosViaje.crear(viajeId, input, idSiEsConductor(user));
  }

  ticketGasto(gastoId: string, ticket: ArchivoSubido | undefined, user: AuthPrincipal) {
    if (!ticket) {
      throw new BadRequestException('No se recibió ningún ticket');
    }
    validarImagen(ticket);
    return this.gastosViaje.guardarTicket(gastoId, ticket, idSiEsConductor(user));
  }

  eliminarGasto(gastoId: string, user: AuthPrincipal) {
    return this.gastosViaje.eliminar(gastoId, idSiEsConductor(user));
  }

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

  /** Desglose de ingreso, costos y estancias por escala de un viaje. */
  margen(id: string) {
    return this.margenViaje.execute(id);
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

  /**
   * Reemplaza el manifiesto de pasajeros de un viaje de personal.
   */
  gestionarPasajeros(viajeId: string, pasajeros: PasajeroViajeInput[]) {
    return this.gestionarPasajerosUC.execute(viajeId, pasajeros);
  }

  /** Historial reciente de llegadas (geocercas) para la campana del panel. */
  llegadasRecientes() {
    return this.listarLlegadas.execute();
  }
}
