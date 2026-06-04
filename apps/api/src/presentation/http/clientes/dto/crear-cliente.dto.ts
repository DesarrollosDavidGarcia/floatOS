import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactoNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactoTelefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de contacto no es válido' })
  contactoEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;
}
