import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearSucursalDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la sucursal es obligatorio' })
  @MaxLength(200)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(13) rfc?: string;
  @IsOptional() @IsString() calle?: string;
  @IsOptional() @IsString() numeroExt?: string;
  @IsOptional() @IsString() numeroInt?: string;
  @IsOptional() @IsString() colonia?: string;
  @IsOptional() @IsString() @MaxLength(5) cp?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsBoolean() esPrincipal?: boolean;
  @IsOptional() @IsInt() orden?: number;
}

export class ActualizarSucursalDto extends PartialType(CrearSucursalDto) {}
