import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MensajeChat } from '@prisma/client';
import { MensajeChatPayload } from '@flotaos/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { TrackingGateway } from '../../presentation/ws/tracking/tracking.gateway';
import { AuthPrincipal } from '../../presentation/http/auth/decorators/current-user.decorator';
import { validarFirmaArchivo } from '../shared/validar-archivo';

/** Archivo recibido por multipart (subconjunto de Express.Multer.File). */
export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
export const CHAT_TAMANO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface NoLeidosViaje {
  viajeId: string;
  folio: number;
  cantidad: number;
}

/** Resumen de no leídos para la campana del panel / app del conductor. */
export interface NoLeidosResumen {
  total: number;
  porViaje: NoLeidosViaje[];
}

/** Opciones de paginación por cursor para el historial de chat. */
export interface ListarOpciones {
  /** Tamaño de página (clamp 1..MAX). Por defecto CHAT_PAGINA_DEFECTO. */
  limit?: number;
  /**
   * Cursor = id del mensaje más antiguo ya cargado. Devuelve la página de
   * mensajes ANTERIORES a ese (más viejos). Si se omite, primera página
   * (los más recientes).
   */
  cursor?: string;
}

/** Página del historial de chat (mensajes en orden cronológico ASCENDENTE). */
export interface ListarResultado {
  /** Mensajes de la página, ordenados ascendente (listos para renderizar). */
  mensajes: MensajeChatPayload[];
  /** Hay mensajes más antiguos disponibles (otra página hacia atrás). */
  hayMas: boolean;
  /**
   * Cursor para pedir la siguiente página (más antigua): el id del mensaje
   * más viejo de esta página. `null` si no hay más.
   */
  siguienteCursor: string | null;
}

/** Tamaño de página por defecto del historial de chat. */
export const CHAT_PAGINA_DEFECTO = 40;
/** Tamaño de página máximo aceptado. */
export const CHAT_PAGINA_MAX = 100;

/**
 * Chat por viaje (monitorista ↔ conductor). Persiste mensajes con adjunto
 * opcional en MinIO, emite en tiempo real por el gateway y lleva el conteo de
 * no leídos por lado (panel vs conductor).
 */
@Injectable()
export class ChatUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly tracking: TrackingGateway,
  ) {}

  /**
   * Historial del chat de un viaje paginado por cursor. Internamente consulta
   * en orden DESCENDENTE (los más recientes / la página solicitada) y devuelve
   * los mensajes ya invertidos a orden ASCENDENTE para renderizar directo.
   *
   * - Sin `cursor`: primera página (los mensajes más recientes).
   * - Con `cursor` (id del mensaje más antiguo ya cargado): la página de
   *   mensajes anteriores a ese (más viejos).
   */
  async listar(
    viajeId: string,
    principal: AuthPrincipal,
    opciones: ListarOpciones = {},
  ): Promise<ListarResultado> {
    await this.autorizarObtenerConductor(viajeId, principal);

    const limit = this.normalizarLimit(opciones.limit);
    // Pedimos uno extra para saber si hay más páginas sin un count adicional.
    const filas = await this.prisma.mensajeChat.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      // `skip: 1` + `cursor` excluye el propio mensaje del cursor (ya cargado).
      ...(opciones.cursor
        ? { cursor: { id: opciones.cursor }, skip: 1 }
        : {}),
    });

    const hayMas = filas.length > limit;
    const pagina = hayMas ? filas.slice(0, limit) : filas;
    // `pagina` viene descendente (recientes→viejos). El cursor para la siguiente
    // página (más antigua) es el mensaje más viejo de esta página.
    const siguienteCursor = hayMas
      ? (pagina[pagina.length - 1]?.id ?? null)
      : null;

    // Invertimos a ascendente para el render.
    const ascendente = [...pagina].reverse();
    const mensajes = await Promise.all(
      ascendente.map((m) => this.aPayload(m)),
    );
    return { mensajes, hayMas, siguienteCursor };
  }

  private normalizarLimit(limit?: number): number {
    if (limit == null || Number.isNaN(limit)) return CHAT_PAGINA_DEFECTO;
    return Math.min(Math.max(Math.trunc(limit), 1), CHAT_PAGINA_MAX);
  }

  /** Envía un mensaje (texto y/o un adjunto imagen/PDF). */
  async enviar(
    viajeId: string,
    principal: AuthPrincipal,
    texto: string | undefined,
    archivo: ArchivoSubido | undefined,
  ): Promise<MensajeChatPayload> {
    const conductorViaje = await this.autorizarObtenerConductor(
      viajeId,
      principal,
    );

    const textoLimpio = texto?.trim() || null;
    if (!textoLimpio && !archivo) {
      throw new BadRequestException('El mensaje no puede estar vacío.');
    }

    let archivoKey: string | null = null;
    let archivoNombre: string | null = null;
    let archivoTipo: string | null = null;
    let archivoBytes: number | null = null;
    if (archivo) {
      if (!TIPOS_PERMITIDOS.has(archivo.mimetype)) {
        throw new BadRequestException(
          'Tipo no permitido. Se aceptan PDF, JPG, PNG y WEBP.',
        );
      }
      // Defensa en capas: verifica la firma real de bytes, no solo el mimetype
      // declarado (falsificable por el cliente).
      validarFirmaArchivo(archivo.buffer, archivo.mimetype);
      if (archivo.size > CHAT_TAMANO_MAX_BYTES) {
        throw new BadRequestException('El archivo supera el máximo de 10 MB.');
      }
      archivoKey = this.storage.generarKey(
        `chat/${viajeId}`,
        archivo.originalname,
      );
      await this.storage.subir(archivoKey, archivo.buffer, archivo.mimetype);
      archivoNombre = archivo.originalname;
      archivoTipo = archivo.mimetype;
      archivoBytes = archivo.size;
    }

    const esMonitorista = principal.type === 'admin';
    const autorNombre = await this.nombreAutor(principal);

    const mensaje = await this.prisma.mensajeChat.create({
      data: {
        viajeId,
        autorTipo: esMonitorista ? 'MONITORISTA' : 'CONDUCTOR',
        usuarioId: esMonitorista ? principal.sub : null,
        conductorId: esMonitorista ? null : principal.sub,
        autorNombre,
        texto: textoLimpio,
        archivoKey,
        archivoNombre,
        archivoTipo,
        archivoBytes,
        // El emisor ya "leyó" su propio mensaje; el otro lado queda sin leer.
        leidoMonitorista: esMonitorista,
        leidoConductor: !esMonitorista,
      },
    });

    const payload = await this.aPayload(mensaje);
    // Emitimos a la sala personal del conductor DEL VIAJE (el destinatario),
    // no a la del autor: así el conductor recibe el mensaje del monitorista en
    // vivo aunque no esté suscrito a la sala del viaje (p. ej. sin tracking activo).
    this.tracking.emitirMensajeChat(viajeId, conductorViaje, payload);
    return payload;
  }

  /** Marca como leídos los mensajes del OTRO lado para el viaje. */
  async marcarLeido(viajeId: string, principal: AuthPrincipal): Promise<void> {
    await this.autorizarObtenerConductor(viajeId, principal);
    if (principal.type === 'admin') {
      await this.prisma.mensajeChat.updateMany({
        where: { viajeId, autorTipo: 'CONDUCTOR', leidoMonitorista: false },
        data: { leidoMonitorista: true },
      });
    } else {
      await this.prisma.mensajeChat.updateMany({
        where: { viajeId, autorTipo: 'MONITORISTA', leidoConductor: false },
        data: { leidoConductor: true },
      });
    }
  }

  /**
   * Conteo de no leídos. Para el panel (admin): mensajes del conductor sin leer,
   * agrupados por viaje. Para el conductor: mensajes del panel sin leer en sus
   * viajes.
   */
  async noLeidos(principal: AuthPrincipal): Promise<NoLeidosResumen> {
    const where =
      principal.type === 'admin'
        ? { autorTipo: 'CONDUCTOR' as const, leidoMonitorista: false }
        : {
            autorTipo: 'MONITORISTA' as const,
            leidoConductor: false,
            viaje: { conductorId: principal.sub },
          };

    const grupos = await this.prisma.mensajeChat.groupBy({
      by: ['viajeId'],
      where,
      _count: { _all: true },
    });
    if (grupos.length === 0) return { total: 0, porViaje: [] };

    const folios = await this.prisma.viaje.findMany({
      where: { id: { in: grupos.map((g) => g.viajeId) } },
      select: { id: true, folio: true },
    });
    const folioPorId = new Map(folios.map((v) => [v.id, v.folio]));

    const porViaje = grupos.map((g) => ({
      viajeId: g.viajeId,
      folio: folioPorId.get(g.viajeId) ?? 0,
      cantidad: g._count._all,
    }));
    const total = porViaje.reduce((acc, v) => acc + v.cantidad, 0);
    return { total, porViaje };
  }

  /**
   * Verifica que el principal pueda acceder al chat del viaje y devuelve el
   * `conductorId` del viaje (destinatario para la emisión en vivo).
   */
  private async autorizarObtenerConductor(
    viajeId: string,
    principal: AuthPrincipal,
  ): Promise<string | null> {
    const viaje = await this.prisma.viaje.findUnique({
      where: { id: viajeId },
      select: { conductorId: true },
    });
    if (!viaje) {
      throw new NotFoundException(`Viaje con id ${viajeId} no encontrado`);
    }
    if (principal.type === 'conductor' && viaje.conductorId !== principal.sub) {
      throw new ForbiddenException('No participas en este viaje');
    }
    return viaje.conductorId;
  }

  private async nombreAutor(principal: AuthPrincipal): Promise<string> {
    if (principal.type === 'admin') {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: principal.sub },
        select: { nombre: true },
      });
      return usuario?.nombre ?? 'Monitorista';
    }
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: principal.sub },
      select: { nombre: true, apellidos: true },
    });
    if (!conductor) return 'Conductor';
    return `${conductor.nombre} ${conductor.apellidos ?? ''}`.trim();
  }

  private async aPayload(m: MensajeChat): Promise<MensajeChatPayload> {
    return {
      id: m.id,
      viajeId: m.viajeId,
      autorTipo: m.autorTipo,
      autorNombre: m.autorNombre,
      texto: m.texto,
      archivoUrl: m.archivoKey
        ? await this.storage.urlVisualizacion(m.archivoKey)
        : null,
      archivoNombre: m.archivoNombre,
      archivoTipo: m.archivoTipo,
      archivoBytes: m.archivoBytes,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
