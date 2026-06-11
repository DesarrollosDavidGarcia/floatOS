import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Un contacto del cliente (nombre + correo + celular). */
export class ContactoClienteDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del contacto es obligatorio' })
  @MaxLength(255)
  nombre!: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo del contacto no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;
}

/** Datos para crear un cliente final del transportista. */
export class CrearClienteDto {
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @MaxLength(255)
  razonSocial!: string;

  @IsOptional()
  @IsString()
  @MaxLength(13, { message: 'El RFC no puede exceder 13 caracteres' })
  rfc?: string;

  // Datos fiscales (CFDI 4.0) — códigos de catálogo SAT.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  regimenFiscal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  usoCfdi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'El código postal no puede exceder 10 caracteres' })
  cpFiscal?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de facturación no es válido' })
  emailFacturacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'Máximo 30 contactos' })
  @ValidateNested({ each: true })
  @Type(() => ContactoClienteDto)
  contactos?: ContactoClienteDto[];
}
