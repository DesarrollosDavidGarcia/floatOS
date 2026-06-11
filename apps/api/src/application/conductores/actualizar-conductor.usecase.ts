import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PasswordService } from '../../infrastructure/shared/password.service';
import {
  aConductorPublico,
  ConductorPublico,
} from './conductores.types';

export interface ActualizarConductorInput {
  nombre?: string;
  apellidos?: string;
  usuario?: string;
  email?: string;
  telefono?: string;
  password?: string;
  activo?: boolean;
  // Campos de Recursos Humanos
  curp?: string;
  rfc?: string;
  nss?: string;
  fechaNacimiento?: string;
  tipoSangre?: string;
  direccion?: string;
  numeroEmpleado?: string;
  puesto?: string;
  fechaIngreso?: string;
  categoriaLicencia?: string;
  emergenciaNombre?: string;
  emergenciaTelefono?: string;
  emergenciaRelacion?: string;
  // Contratación (planta / freelance / terciarizado)
  tipoContratacion?: string;
  empresaProveedor?: string;
  empresaProveedorRfc?: string;
  proveedorContactoNombre?: string;
  proveedorContactoTelefono?: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  notasContratacion?: string;
}

/** Caso de uso: actualizar datos del conductor (re-hashea password si llega). */
@Injectable()
export class ActualizarConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(
    id: string,
    input: ActualizarConductorInput,
  ): Promise<ConductorPublico> {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id },
    });
    if (!conductor) {
      throw new NotFoundException(`Conductor con id ${id} no encontrado`);
    }

    if (input.usuario && input.usuario !== conductor.usuario) {
      const existente = await this.prisma.conductor.findUnique({
        where: { usuario: input.usuario },
      });
      if (existente) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
    }

    if (input.email && input.email !== conductor.email) {
      const conEmail = await this.prisma.conductor.findUnique({
        where: { email: input.email },
      });
      if (conEmail) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    const data: Prisma.ConductorUpdateInput = {};
    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.apellidos !== undefined) data.apellidos = input.apellidos;
    if (input.usuario !== undefined) data.usuario = input.usuario;
    if (input.email !== undefined) data.email = input.email;
    if (input.telefono !== undefined) data.telefono = input.telefono;
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.password !== undefined) {
      data.passwordHash = await this.passwordService.hash(input.password);
    }
    // Campos de Recursos Humanos
    if (input.curp !== undefined) data.curp = input.curp;
    if (input.rfc !== undefined) data.rfc = input.rfc;
    if (input.nss !== undefined) data.nss = input.nss;
    if (input.fechaNacimiento !== undefined) {
      data.fechaNacimiento = input.fechaNacimiento ? new Date(input.fechaNacimiento) : null;
    }
    if (input.tipoSangre !== undefined) data.tipoSangre = input.tipoSangre;
    if (input.direccion !== undefined) data.direccion = input.direccion;
    if (input.numeroEmpleado !== undefined) data.numeroEmpleado = input.numeroEmpleado;
    if (input.puesto !== undefined) data.puesto = input.puesto;
    if (input.fechaIngreso !== undefined) {
      data.fechaIngreso = input.fechaIngreso ? new Date(input.fechaIngreso) : null;
    }
    if (input.categoriaLicencia !== undefined) data.categoriaLicencia = input.categoriaLicencia;
    if (input.emergenciaNombre !== undefined) data.emergenciaNombre = input.emergenciaNombre;
    if (input.emergenciaTelefono !== undefined) data.emergenciaTelefono = input.emergenciaTelefono;
    if (input.emergenciaRelacion !== undefined) data.emergenciaRelacion = input.emergenciaRelacion;
    // Contratación
    if (input.tipoContratacion !== undefined) data.tipoContratacion = input.tipoContratacion;
    if (input.empresaProveedor !== undefined) data.empresaProveedor = input.empresaProveedor;
    if (input.empresaProveedorRfc !== undefined) data.empresaProveedorRfc = input.empresaProveedorRfc;
    if (input.proveedorContactoNombre !== undefined)
      data.proveedorContactoNombre = input.proveedorContactoNombre;
    if (input.proveedorContactoTelefono !== undefined)
      data.proveedorContactoTelefono = input.proveedorContactoTelefono;
    if (input.vigenciaDesde !== undefined) {
      data.vigenciaDesde = input.vigenciaDesde ? new Date(input.vigenciaDesde) : null;
    }
    if (input.vigenciaHasta !== undefined) {
      data.vigenciaHasta = input.vigenciaHasta ? new Date(input.vigenciaHasta) : null;
    }
    if (input.notasContratacion !== undefined) data.notasContratacion = input.notasContratacion;
    // Consistencia por tipo: al cambiar el tipo de contratación, limpia los datos
    // que no le corresponden (evita empresa/vigencia colgados que dispararían alertas).
    if (input.tipoContratacion !== undefined) {
      const terciarizado = input.tipoContratacion === 'TERCIARIZADO';
      const externo =
        input.tipoContratacion === 'FREELANCE' || input.tipoContratacion === 'TERCIARIZADO';
      if (!terciarizado) {
        data.empresaProveedor = null;
        data.empresaProveedorRfc = null;
        data.proveedorContactoNombre = null;
        data.proveedorContactoTelefono = null;
      }
      if (!externo) {
        data.vigenciaDesde = null;
        data.vigenciaHasta = null;
        data.notasContratacion = null;
      }
    }

    const actualizado = await this.prisma.conductor.update({
      where: { id },
      data,
    });

    return aConductorPublico(actualizado);
  }
}
