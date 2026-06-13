import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PasswordService } from '../../infrastructure/shared/password.service';
import {
  aConductorPublico,
  ConductorPublico,
} from './conductores.types';

export interface CrearConductorInput {
  nombre: string;
  apellidos?: string;
  usuario: string;
  email?: string;
  telefono?: string;
  password: string;
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

/** Caso de uso: el admin crea un conductor con credenciales para la app. */
@Injectable()
export class CrearConductorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: CrearConductorInput): Promise<ConductorPublico> {
    const existente = await this.prisma.conductor.findUnique({
      where: { usuario: input.usuario },
    });
    if (existente) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    if (input.email) {
      const conEmail = await this.prisma.conductor.findUnique({
        where: { email: input.email },
      });
      if (conEmail) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    const passwordHash = await this.passwordService.hash(input.password);

    // Consistencia por tipo: empresa proveedora solo terciarizado; vigencia/notas
    // solo externos (freelance/terciarizado); planta no lleva nada de esto.
    const tipo = input.tipoContratacion ?? 'PLANTA';
    const terciarizado = tipo === 'TERCIARIZADO';
    const externo = tipo === 'FREELANCE' || tipo === 'TERCIARIZADO';

    const conductor = await this.prisma.conductor.create({
      data: {
        nombre: input.nombre,
        apellidos: input.apellidos ?? null,
        usuario: input.usuario,
        email: input.email ?? null,
        telefono: input.telefono ?? null,
        passwordHash,
        // Campos de Recursos Humanos
        curp: input.curp ?? null,
        rfc: input.rfc ?? null,
        nss: input.nss ?? null,
        fechaNacimiento: input.fechaNacimiento ? new Date(input.fechaNacimiento) : null,
        tipoSangre: input.tipoSangre ?? null,
        direccion: input.direccion ?? null,
        numeroEmpleado: input.numeroEmpleado ?? null,
        puesto: input.puesto ?? null,
        fechaIngreso: input.fechaIngreso ? new Date(input.fechaIngreso) : null,
        categoriaLicencia: input.categoriaLicencia ?? null,
        emergenciaNombre: input.emergenciaNombre ?? null,
        emergenciaTelefono: input.emergenciaTelefono ?? null,
        emergenciaRelacion: input.emergenciaRelacion ?? null,
        // Contratación
        tipoContratacion: tipo,
        empresaProveedor: terciarizado ? (input.empresaProveedor ?? null) : null,
        empresaProveedorRfc: terciarizado ? (input.empresaProveedorRfc ?? null) : null,
        proveedorContactoNombre: terciarizado ? (input.proveedorContactoNombre ?? null) : null,
        proveedorContactoTelefono: terciarizado ? (input.proveedorContactoTelefono ?? null) : null,
        vigenciaDesde: externo && input.vigenciaDesde ? new Date(input.vigenciaDesde) : null,
        vigenciaHasta: externo && input.vigenciaHasta ? new Date(input.vigenciaHasta) : null,
        notasContratacion: externo ? (input.notasContratacion ?? null) : null,
      },
    });

    return aConductorPublico(conductor);
  }
}
