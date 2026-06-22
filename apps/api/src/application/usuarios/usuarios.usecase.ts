import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Usuario } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PasswordService } from '../../infrastructure/shared/password.service';
import { aUsuarioPublico, UsuarioPublico } from '../auth/auth.types';

interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: Usuario['rol'];
}

interface ActualizarUsuarioInput {
  nombre?: string;
  rol?: Usuario['rol'];
  activo?: boolean;
  password?: string;
}

/** ABM de usuarios del panel (admins y monitoristas). Solo accesible por admins. */
@Injectable()
export class UsuariosUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async listar(): Promise<UsuarioPublico[]> {
    const usuarios = await this.prisma.usuario.findMany({
      orderBy: [{ activo: 'desc' }, { createdAt: 'asc' }],
    });
    return usuarios.map(aUsuarioPublico);
  }

  async crear(input: CrearUsuarioInput): Promise<UsuarioPublico> {
    const passwordHash = await this.passwordService.hash(input.password);
    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nombre: input.nombre,
          email: input.email.toLowerCase(),
          passwordHash,
          rol: input.rol,
        },
      });
      return aUsuarioPublico(usuario);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw e;
    }
  }

  async actualizar(
    id: string,
    input: ActualizarUsuarioInput,
    actorId: string,
  ): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    const desactivando = input.activo === false && usuario.activo;
    const degradando =
      input.rol !== undefined &&
      input.rol !== 'ADMIN' &&
      usuario.rol === 'ADMIN';

    // Simetría con eliminar: no permitimos quitarte a ti mismo el acceso.
    if ((desactivando || degradando) && usuario.id === actorId) {
      throw new BadRequestException(
        'No puedes quitarte a ti mismo el acceso de administrador',
      );
    }

    const data: Prisma.UsuarioUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.rol !== undefined) data.rol = input.rol;
    if (input.activo !== undefined) {
      data.activo = input.activo;
      // Al desactivar, invalidamos la sesión activa (refresh ya no rota).
      if (input.activo === false) data.refreshTokenHash = null;
    }
    if (input.password !== undefined) {
      data.passwordHash = await this.passwordService.hash(input.password);
      // Cambiar contraseña también cierra sesiones existentes.
      data.refreshTokenHash = null;
    }

    // Verificación "último admin" + mutación en una transacción para evitar
    // que dos operaciones concurrentes dejen el panel sin admins activos.
    const actualizado = await this.prisma.$transaction(async (tx) => {
      if (desactivando || degradando) {
        await this.garantizarOtroAdminActivo(usuario, tx);
      }
      return tx.usuario.update({ where: { id }, data });
    });
    return aUsuarioPublico(actualizado);
  }

  async eliminar(id: string, actorId: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    if (usuario.id === actorId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }
    await this.prisma.$transaction(async (tx) => {
      if (usuario.rol === 'ADMIN' && usuario.activo) {
        await this.garantizarOtroAdminActivo(usuario, tx);
      }
      await tx.usuario.delete({ where: { id } });
    });
  }

  /** Impide quedarse sin ningún admin activo (lockout del panel). */
  private async garantizarOtroAdminActivo(
    actual: Usuario,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const otrosAdminsActivos = await tx.usuario.count({
      where: { rol: 'ADMIN', activo: true, id: { not: actual.id } },
    });
    if (otrosAdminsActivos === 0) {
      throw new ForbiddenException(
        'Debe quedar al menos un administrador activo',
      );
    }
  }
}
