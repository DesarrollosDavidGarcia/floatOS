import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CategoriaLicencia } from '@flotaos/shared-types';

export class CrearConductorDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsString()
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  usuario!: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  // ── Campos de Recursos Humanos ──────────────────────────────────────────────

  @IsOptional()
  @IsString()
  curp?: string;

  @IsOptional()
  @IsString()
  rfc?: string;

  @IsOptional()
  @IsString()
  nss?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  tipoSangre?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  numeroEmpleado?: string;

  @IsOptional()
  @IsString()
  puesto?: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsEnum(CategoriaLicencia)
  categoriaLicencia?: CategoriaLicencia;

  @IsOptional()
  @IsString()
  emergenciaNombre?: string;

  @IsOptional()
  @IsString()
  emergenciaTelefono?: string;

  @IsOptional()
  @IsString()
  emergenciaRelacion?: string;
}
