import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, SeccionExpediente } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArchivosExpedienteUseCase } from '../archivos-expediente.usecase';
import { asegurarConductorExiste } from './asegurar-conductor';

/**
 * Tipo de transformación de un campo entre el DTO (entrada) y el `data` de
 * Prisma. Reproduce EXACTAMENTE los patrones que tenían a mano los 9 usecases
 * del expediente, para no alterar el comportamiento al consolidarlos:
 *
 * - `requerido`        crear: `input.x`                       update: copia si definido
 * - `opcionalNull`     crear: `input.x ?? null`              update: copia si definido
 * - `opcionalUndefined`crear: `input.x ?? undefined`         update: copia si definido
 * - `boolDefault`      crear: `input.x ?? <valorDefault>`    update: copia si definido
 * - `fechaRequerida`   crear: `new Date(input.x)`            update: `new Date(input.x)` si definido
 * - `fechaOpcional`    crear: `input.x ? new Date(input.x) : null`  update: `new Date(input.x)` si definido
 * - `decimalOpcional`  crear: `input.x != null ? new Decimal : null` update: `new Decimal` si definido
 */
export type TipoCampo =
  | 'requerido'
  | 'opcionalNull'
  | 'opcionalUndefined'
  | 'boolDefault'
  | 'fechaRequerida'
  | 'fechaOpcional'
  | 'decimalOpcional';

export interface CampoConfig {
  /** Nombre de la propiedad, idéntico en el DTO y en la tabla. */
  nombre: string;
  tipo: TipoCampo;
  /** Solo para `boolDefault`: valor por defecto cuando la entrada es undefined. */
  valorDefault?: boolean;
}

/**
 * Configuración por sub-recurso del expediente. Encapsula lo único que difiere
 * entre los 9 casos de uso.
 */
export interface ExpedienteSubrecursoConfig {
  /**
   * Devuelve el delegate de Prisma del modelo (p. ej.
   * `prisma.capacitacionConductor`). Tipado como `unknown` para evitar las
   * incompatibilidades de las firmas genéricas/sobrecargadas de cada delegate
   * concreto de Prisma; internamente se usa como {@link DelegadoPrisma}.
   */
  delegate: (prisma: PrismaService) => unknown;
  /** Texto del 404 al no hallar el registro: `${etiqueta} con id ${id} ${noEncontrado}`. */
  etiqueta: string;
  /**
   * Cierre de la frase del 404. Acepta variantes de género/concordancia que ya
   * existían ("no encontrada" / "no encontrado").
   */
  noEncontrado: string;
  /** Orden del listado. Reproduce el `orderBy` original de cada sección. */
  orderBy: Record<string, 'asc' | 'desc'>;
  /** Campos del modelo (excluye `conductorId`, que siempre se asigna en crear). */
  campos: CampoConfig[];
  /**
   * Sección de archivos de evidencia a limpiar al borrar (solo las 6 secciones
   * con adjuntos). Si se omite, `eliminar` no toca archivos.
   */
  seccionArchivo?: SeccionExpediente;
  /**
   * Mensaje de conflicto si un `create`/`update` viola una restricción única
   * (Prisma P2002). Solo lo usa aptitudes-unidad.
   */
  conflictoUnico?: string;
}

/**
 * Subconjunto mínimo del delegate de Prisma que usan los sub-recursos. Tipado
 * laxo a propósito (`any` en data/where) porque cada sub-recurso aporta su
 * propio modelo concreto; la seguridad de tipos vive en las interfaces
 * `Crear*Input` / `Actualizar*Input` de cada usecase.
 */
interface DelegadoPrisma {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(args: { data: any }): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany(args: { where: any; orderBy: any }): Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findUnique(args: { where: { id: string } }): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(args: { where: { id: string }; data: any }): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(args: { where: { id: string } }): Promise<any>;
}

/**
 * Comportamiento común de los 9 sub-recursos del expediente del conductor:
 * `asegurarConductor` + CRUD con find-or-404 (validando `conductorId`) y
 * limpieza de archivos adjuntos antes del borrado.
 *
 * Cada sub-recurso extiende esta clase pasando su {@link ExpedienteSubrecursoConfig}
 * y conserva su propio nombre de clase y sus interfaces `Crear*` / `Actualizar*`.
 * Las particularidades (Decimal, restricción única, defaults de schema) se
 * modelan vía la config, no con overrides, salvo que se documente lo contrario.
 *
 * @typeParam TModel  Entidad Prisma devuelta.
 * @typeParam TCrear  DTO de creación.
 * @typeParam TActualizar DTO de actualización (parcial).
 */
export abstract class ExpedienteSubrecursoService<
  TModel,
  TCrear extends object,
  TActualizar extends object,
> {
  protected constructor(
    protected readonly prisma: PrismaService,
    protected readonly config: ExpedienteSubrecursoConfig,
    /** Solo lo inyectan las secciones con archivos adjuntos. */
    protected readonly archivos?: ArchivosExpedienteUseCase,
  ) {}

  private get delegate(): DelegadoPrisma {
    return this.config.delegate(this.prisma) as DelegadoPrisma;
  }

  protected asegurarConductor(conductorId: string): Promise<void> {
    return asegurarConductorExiste(this.prisma, conductorId);
  }

  /** Transforma un valor según el tipo de campo para un `create`. */
  private valorCrear(campo: CampoConfig, valor: unknown): unknown {
    switch (campo.tipo) {
      case 'requerido':
        return valor;
      case 'opcionalNull':
        return valor ?? null;
      case 'opcionalUndefined':
        return valor ?? undefined;
      case 'boolDefault':
        return valor ?? campo.valorDefault;
      case 'fechaRequerida':
        return new Date(valor as string);
      case 'fechaOpcional':
        return valor ? new Date(valor as string) : null;
      case 'decimalOpcional':
        return valor !== undefined
          ? new Prisma.Decimal(valor as number)
          : null;
    }
  }

  /**
   * Transforma un valor (ya garantizado `!== undefined`) para un `update`
   * parcial. Solo difiere de `valorCrear` en fechas/decimales y en que el
   * resto se copia tal cual (sin aplicar defaults).
   */
  private valorActualizar(campo: CampoConfig, valor: unknown): unknown {
    switch (campo.tipo) {
      case 'fechaRequerida':
      case 'fechaOpcional':
        return new Date(valor as string);
      case 'decimalOpcional':
        return new Prisma.Decimal(valor as number);
      default:
        return valor;
    }
  }

  /** Envuelve create/update para traducir P2002 a 409 si la sección lo define. */
  private async ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    if (!this.config.conflictoUnico) {
      return operacion();
    }
    try {
      return await operacion();
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(this.config.conflictoUnico);
      }
      throw err;
    }
  }

  async crear(conductorId: string, input: TCrear): Promise<TModel> {
    await this.asegurarConductor(conductorId);

    const fuente = input as Record<string, unknown>;
    const data: Record<string, unknown> = { conductorId };
    for (const campo of this.config.campos) {
      data[campo.nombre] = this.valorCrear(campo, fuente[campo.nombre]);
    }

    return this.ejecutar(() => this.delegate.create({ data }));
  }

  async listar(conductorId: string): Promise<TModel[]> {
    await this.asegurarConductor(conductorId);

    return this.delegate.findMany({
      where: { conductorId },
      orderBy: this.config.orderBy,
    });
  }

  async obtener(conductorId: string, id: string): Promise<TModel> {
    const registro = await this.delegate.findUnique({ where: { id } });
    if (!registro || registro.conductorId !== conductorId) {
      throw new NotFoundException(
        `${this.config.etiqueta} con id ${id} ${this.config.noEncontrado}`,
      );
    }
    return registro;
  }

  async actualizar(
    conductorId: string,
    id: string,
    input: TActualizar,
  ): Promise<TModel> {
    await this.obtener(conductorId, id);

    const fuente = input as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const campo of this.config.campos) {
      const valor = fuente[campo.nombre];
      if (valor !== undefined) {
        data[campo.nombre] = this.valorActualizar(campo, valor);
      }
    }

    return this.ejecutar(() => this.delegate.update({ where: { id }, data }));
  }

  async eliminar(conductorId: string, id: string): Promise<void> {
    await this.obtener(conductorId, id);
    if (this.config.seccionArchivo && this.archivos) {
      await this.archivos.eliminarDeRegistro(this.config.seccionArchivo, id);
    }
    await this.delegate.delete({ where: { id } });
  }
}
