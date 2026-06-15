import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  WS_EVENTS,
  type AlertaLlegadaPayload,
  type ReasignacionViajePayload,
} from '@flotaos/shared-types';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { COOKIE_ACCESS, valorDeCookie } from '../../http/auth/cookies';

/** Construye el nombre de la sala de un viaje. */
function salaViaje(viajeId: string): string {
  return `viaje:${viajeId}`;
}

/** Sala personal de un conductor (avisos dirigidos: reasignación, etc.). */
function salaConductor(conductorId: string): string {
  return `conductor:${conductorId}`;
}

/**
 * Sala global de monitoristas: todos los admin se unen al conectarse y reciben
 * las alertas de llegada de CUALQUIER viaje (notificaciones globales del panel),
 * sin tener que estar suscritos a la sala de cada viaje.
 */
const SALA_ADMIN = 'admin';

/** Principal autenticado almacenado en client.data tras el handshake. */
interface SocketPrincipal {
  sub: string;
  type: 'admin' | 'conductor';
}

/** Estructura mínima del payload JWT firmado por la API ({ sub, type }). */
interface JwtPayload {
  sub?: string;
  type?: 'admin' | 'conductor';
}

/** Payload del evento de suscripción enviado por el cliente. */
interface SuscribirPayload {
  viajeId: string;
}

/**
 * cors.origin: se toma de CORS_ORIGIN (coma-separado) si está definido; en caso
 * contrario se refleja el origen (`true`) para permitir credenciales en dev.
 * Se usa junto a `credentials: true` para que el navegador envíe la cookie
 * httpOnly de acceso en el handshake. IMPORTANTE: fijar CORS_ORIGIN en producción.
 */
function resolverCorsOrigin(): string[] | boolean {
  const env = process.env.CORS_ORIGIN;
  if (!env) {
    return true;
  }
  return env
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/**
 * Gateway Socket.io para seguimiento en tiempo real.
 * Autentica cada conexión mediante JWT en el handshake. El monitorista (admin)
 * o el conductor dueño del viaje se unen a la sala 'viaje:<viajeId>' y reciben
 * ubicaciones, cambios de estado y alertas reemitidas por la API.
 */
@WebSocketGateway({
  cors: { origin: resolverCorsOrigin(), credentials: true },
  namespace: 'tracking',
})
export class TrackingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Autentica la conexión WS: extrae el JWT del handshake (auth.token o header
   * Authorization), lo verifica con JWT_SECRET y guarda el principal en
   * client.data. Si el token es inválido o falta, desconecta el socket.
   */
  handleConnection(client: Socket): void {
    try {
      const token = this.extraerToken(client);
      if (!token) {
        throw new Error('Token ausente');
      }
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
      if (
        !payload?.sub ||
        (payload.type !== 'admin' && payload.type !== 'conductor')
      ) {
        throw new Error('Token inválido');
      }
      const principal: SocketPrincipal = {
        sub: payload.sub,
        type: payload.type,
      };
      client.data.principal = principal;
      // El monitorista entra a la sala global de admin para recibir las alertas
      // de llegada de todos los viajes (notificaciones globales del panel). El
      // conductor entra a su sala personal para recibir avisos dirigidos (p. ej.
      // que lo reasignaron o le asignaron un viaje).
      if (principal.type === 'admin') {
        void client.join(SALA_ADMIN);
      } else {
        void client.join(salaConductor(principal.sub));
      }
      this.logger.debug(
        `Cliente ${client.id} autenticado como ${principal.type}:${principal.sub}`,
      );
    } catch {
      this.logger.warn(`Conexión WS rechazada (cliente ${client.id})`);
      client.disconnect();
    }
  }

  /**
   * Extrae el JWT del handshake: auth.token o Authorization Bearer (app móvil),
   * o la cookie httpOnly de acceso (panel web con withCredentials).
   */
  private extraerToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return valorDeCookie(client.handshake.headers.cookie, COOKIE_ACCESS);
  }

  /**
   * El cliente se suscribe a las actualizaciones de un viaje. Sólo se permite
   * unirse a la sala si es admin (monitorista) o el conductor dueño del viaje.
   */
  @SubscribeMessage('suscribir')
  async manejarSuscripcion(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SuscribirPayload,
  ): Promise<{ ok: boolean; sala: string; error?: string }> {
    const principal = client.data.principal as SocketPrincipal | undefined;
    if (!principal) {
      client.emit(WS_EVENTS.ALERTA, { error: 'No autenticado' });
      return { ok: false, sala: '', error: 'No autenticado' };
    }

    const viajeId = payload?.viajeId;
    if (!viajeId) {
      return { ok: false, sala: '', error: 'viajeId requerido' };
    }

    const autorizado = await this.puedeSuscribirse(principal, viajeId);
    if (!autorizado) {
      client.emit(WS_EVENTS.ALERTA, { error: 'No autorizado para este viaje' });
      return { ok: false, sala: '', error: 'No autorizado' };
    }

    const sala = salaViaje(viajeId);
    void client.join(sala);
    this.logger.debug(`Cliente ${client.id} suscrito a ${sala}`);
    return { ok: true, sala };
  }

  /**
   * Determina si el principal puede unirse a la sala del viaje: admin siempre;
   * conductor sólo si es el dueño del viaje (conductorId === sub).
   */
  private async puedeSuscribirse(
    principal: SocketPrincipal,
    viajeId: string,
  ): Promise<boolean> {
    if (principal.type === 'admin') {
      return true;
    }
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: { conductorId: true },
    });
    return !!viaje && viaje.conductorId === principal.sub;
  }

  /** El cliente se da de baja de un viaje. */
  @SubscribeMessage('desuscribir')
  manejarDesuscripcion(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SuscribirPayload,
  ): { ok: boolean } {
    const viajeId = payload?.viajeId;
    if (viajeId) {
      void client.leave(salaViaje(viajeId));
    }
    return { ok: true };
  }

  /** Reemite una ubicación actualizada a la sala del viaje. */
  emitirUbicacion(viajeId: string, ubicacion: unknown): void {
    this.server
      .to(salaViaje(viajeId))
      .emit(WS_EVENTS.UBICACION_ACTUALIZADA, ubicacion);
  }

  /** Reemite un cambio de estado del viaje a la sala. */
  emitirCambioEstado(viajeId: string, payload: unknown): void {
    this.server
      .to(salaViaje(viajeId))
      .emit(WS_EVENTS.VIAJE_ESTADO_CAMBIADO, payload);
  }

  /**
   * Emite una alerta (p. ej. geocerca de llegada) a la sala del viaje y a la sala
   * global de admin. Socket.io deduplica: un admin presente en ambas salas recibe
   * el evento una sola vez.
   */
  emitirAlerta(viajeId: string, payload: AlertaLlegadaPayload): void {
    this.server
      .to(salaViaje(viajeId))
      .to(SALA_ADMIN)
      .emit(WS_EVENTS.ALERTA, payload);
  }

  /**
   * Avisa de una reasignación (cambio de unidad y/o conductor) a la sala del
   * viaje (conductor saliente, aún suscrito), a las salas personales del
   * conductor saliente y entrante, y a la sala de admin. Socket.io deduplica.
   */
  emitirReasignacion(payload: ReasignacionViajePayload): void {
    let emisor = this.server
      .to(salaViaje(payload.viajeId))
      .to(SALA_ADMIN);
    if (payload.conductorAnteriorId) {
      emisor = emisor.to(salaConductor(payload.conductorAnteriorId));
    }
    if (payload.conductorNuevoId) {
      emisor = emisor.to(salaConductor(payload.conductorNuevoId));
    }
    emisor.emit(WS_EVENTS.VIAJE_REASIGNADO, payload);
  }
}
