import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Una persona a cargo en una escala (recibe el aviso de llegada por email). */
export class ContactoEscalaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del contacto es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email no es un correo válido' })
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

/**
 * Reemplazo completo de los contactos de una escala. Lista vacía = sin contactos.
 */
export class GestionarContactosEscalaDto {
  @IsArray()
  @ArrayMaxSize(20, { message: 'Máximo 20 contactos por escala' })
  @ValidateNested({ each: true })
  @Type(() => ContactoEscalaDto)
  contactos!: ContactoEscalaDto[];
}
