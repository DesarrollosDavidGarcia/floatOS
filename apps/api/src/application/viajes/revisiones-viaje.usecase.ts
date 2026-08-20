import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  OrigenRevision,
  Prisma,
  RevisionViaje,
  TipoRevisionViaje,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { obtenerOFallar } from '../shared/obtener-o-fallar';

/** Estado de un punto del check list. */
export type EstadoItemChecklist = 'OK' | 'MAL' | 'NA';

export interface ItemChecklist {
  /** Clave del catálogo CHECKLIST_UNIDAD. */
  clave: string;
  estado: EstadoItemChecklist;
  nota?: string;
}

export interface CapturarRevisionInput {
  odometro: number;
  nivelCombustiblePct?: number;
  checklist?: ItemChecklist[];
  novedades?: string;
}

/** Revisión con la URL temporal de la foto, lista para mostrarse. */
export interface RevisionVista extends Omit<RevisionViaje, 'fotoTableroKey'> {
  fotoTableroUrl: string | null;
}

const ESTADOS_ITEM: ReadonlySet<string> = new Set(['OK', 'MAL', 'NA']);

/**
 * Revisiones del vehículo a la salida y a la llegada.
 *
 * Cada revisión escribe además el odómetro en el viaje (`odometroInicial` /
 * `odometroFinal`), que es donde lo lee el motor de margen: así el dato vive en
 * un solo sitio y no hay dos verdades sobre los kilómetros.
 */
@Injectable()
export class RevisionesViajeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async aVista(r: RevisionViaje): Promise<RevisionVista> {
    const { fotoTableroKey, ...resto } = r;
    return {
      ...resto,
      fotoTableroUrl: fotoTableroKey
        ? await this.storage.urlVisualizacion(fotoTableroKey)
        : null,
    };
  }

  async listar(viajeId: string): Promise<RevisionVista[]> {
    const filas = await this.prisma.revisionViaje.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(filas.map((r) => this.aVista(r)));
  }

  /** Valida el check list recibido antes de guardarlo como JSON. */
  private normalizarChecklist(items?: ItemChecklist[]): Prisma.InputJsonValue | undefined {
    if (!items) return undefined;
    for (const i of items) {
      if (!i.clave || !ESTADOS_ITEM.has(i.estado)) {
        throw new BadRequestException(
          `Punto de check list inválido: "${i.clave}" con estado "${i.estado}".`,
        );
      }
    }
    return items as unknown as Prisma.InputJsonValue;
  }


  /**
   * Captura (o corrige) la revisión de un tipo. Es idempotente por diseño: el
   * unique (viaje, tipo) hace que recapturar actualice en vez de acumular
   * versiones que dejarían el odómetro ambiguo.
   *
   * El odómetro se replica al viaje porque es donde lo lee el margen. En la
   * revisión de llegada se exige que no sea menor al de salida: un odómetro que
   * retrocede daría kilómetros negativos y un costo por km sin sentido.
   */
  async capturar(
    viajeId: string,
    tipo: TipoRevisionViaje,
    input: CapturarRevisionInput,
    capturadaPor: string,
    origen: OrigenRevision,
    /** Si viene, se exige que el viaje sea de ese conductor. */
    conductorId?: string,
  ): Promise<RevisionVista> {
    const viaje = await obtenerOFallar(
      () =>
        this.prisma.viaje.findUnique({
          where: { id: viajeId },
          select: { id: true, odometroInicial: true, conductorId: true },
        }),
      `Viaje con id ${viajeId} no encontrado`,
    );

    if (conductorId && viaje.conductorId !== conductorId) {
      throw new ForbiddenException('Este viaje no está asignado a usted');
    }
    if (!Number.isInteger(input.odometro) || input.odometro < 0) {
      throw new BadRequestException('El odómetro debe ser un entero positivo');
    }
    if (
      input.nivelCombustiblePct != null &&
      (input.nivelCombustiblePct < 0 || input.nivelCombustiblePct > 100)
    ) {
      throw new BadRequestException(
        'El nivel de combustible va de 0 a 100 por ciento',
      );
    }
    if (
      tipo === TipoRevisionViaje.LLEGADA &&
      viaje.odometroInicial != null &&
      input.odometro < viaje.odometroInicial
    ) {
      throw new ConflictException(
        `El odómetro de llegada (${input.odometro}) no puede ser menor al de salida (${viaje.odometroInicial}).`,
      );
    }

    const checklist = this.normalizarChecklist(input.checklist);
    const datos = {
      odometro: input.odometro,
      nivelCombustiblePct: input.nivelCombustiblePct ?? null,
      novedades: input.novedades ?? null,
      origen,
      capturadaPor,
      ...(checklist !== undefined ? { checklist } : {}),
    };

    // Revisión y odómetro del viaje se escriben juntos: si solo entrara una de
    // las dos, el margen calcularía con datos que no coinciden con la revisión.
    const revision = await this.prisma.$transaction(async (tx) => {
      const guardada = await tx.revisionViaje.upsert({
        where: { viajeId_tipo: { viajeId, tipo } },
        create: { viajeId, tipo, ...datos },
        update: datos,
      });
      await tx.viaje.update({
        where: { id: viajeId },
        data:
          tipo === TipoRevisionViaje.SALIDA
            ? { odometroInicial: input.odometro }
            : { odometroFinal: input.odometro },
      });
      return guardada;
    });

    return this.aVista(revision);
  }

  /** Adjunta la foto del tablero a una revisión ya capturada. */
  async guardarFotoTablero(
    revisionId: string,
    archivo: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<RevisionVista> {
    const revision = await obtenerOFallar(
      () => this.prisma.revisionViaje.findUnique({ where: { id: revisionId } }),
      `Revisión con id ${revisionId} no encontrada`,
    );

    const key = this.storage.generarKey(
      `viajes/${revision.viajeId}/revisiones`,
      archivo.originalname,
    );
    await this.storage.subir(key, archivo.buffer, archivo.mimetype);

    // La foto anterior se borra tras subir la nueva: si el borrado fuera antes y
    // la subida fallara, la revisión se quedaría sin evidencia ninguna.
    const actualizada = await this.prisma.revisionViaje.update({
      where: { id: revisionId },
      data: { fotoTableroKey: key },
    });
    if (revision.fotoTableroKey) {
      await this.storage.eliminar(revision.fotoTableroKey).catch(() => undefined);
    }
    return this.aVista(actualizada);
  }

  /** True si el viaje ya tiene capturada la revisión de ese tipo. */
  async existe(viajeId: string, tipo: TipoRevisionViaje): Promise<boolean> {
    const n = await this.prisma.revisionViaje.count({ where: { viajeId, tipo } });
    return n > 0;
  }
}
