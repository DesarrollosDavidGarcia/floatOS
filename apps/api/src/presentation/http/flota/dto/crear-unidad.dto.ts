import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos para crear una unidad de la flota. */
export class CrearUnidadDto {
  @IsString()
  @IsNotEmpty({ message: 'Las placas son obligatorias' })
  placas!: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de unidad es obligatorio' })
  tipo!: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

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
  @IsString()
  aseguradora?: string;

  @IsOptional()
  @IsString()
  numeroPoliza?: string;
}
