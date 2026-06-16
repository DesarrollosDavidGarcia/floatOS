import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos para crear una caja / remolque de la flota. */
export class CrearCajaDto {
  @IsString()
  @IsNotEmpty({ message: 'Las placas son obligatorias' })
  placas!: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de caja es obligatorio' })
  tipo!: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1900, { message: 'El año no es válido' })
  @Max(2100, { message: 'El año no es válido' })
  anio?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La capacidad en kg debe ser numérica' },
  )
  @Min(0, { message: 'La capacidad en kg no puede ser negativa' })
  capacidadKg?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La capacidad en m³ debe ser numérica' },
  )
  @Min(0, { message: 'La capacidad en m³ no puede ser negativa' })
  capacidadM3?: number;

  @IsOptional()
  @IsString()
  aseguradora?: string;

  @IsOptional()
  @IsString()
  numeroPoliza?: string;
}
