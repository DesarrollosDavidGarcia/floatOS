import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Un punto del check list de la unidad. */
export class ItemChecklistDto {
  @IsString()
  @IsNotEmpty({ message: 'Cada punto del check list necesita su clave' })
  clave!: string;

  @IsIn(['OK', 'MAL', 'NA'], { message: 'El estado debe ser OK, MAL o NA' })
  estado!: 'OK' | 'MAL' | 'NA';

  @IsOptional()
  @IsString()
  nota?: string;
}

/** Revisión del vehículo a la salida o a la llegada. */
export class CapturarRevisionDto {
  @IsInt({ message: 'El odómetro debe ser un número entero' })
  @Min(0, { message: 'El odómetro no puede ser negativo' })
  odometro!: number;

  @IsOptional()
  @IsInt({ message: 'El nivel de combustible debe ser un entero' })
  @Min(0, { message: 'El nivel de combustible va de 0 a 100' })
  @Max(100, { message: 'El nivel de combustible va de 0 a 100' })
  nivelCombustiblePct?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemChecklistDto)
  checklist?: ItemChecklistDto[];

  @IsOptional()
  @IsString()
  novedades?: string;
}

/** Gasto capturado durante el viaje. */
export class CrearGastoDto {
  @IsString()
  @IsNotEmpty({ message: 'El tipo de gasto es obligatorio' })
  tipo!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser numérico' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  monto!: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Los litros deben ser numéricos' })
  @Min(0, { message: 'Los litros no pueden ser negativos' })
  litros?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'El precio por litro debe ser numérico' },
  )
  @Min(0, { message: 'El precio por litro no puede ser negativo' })
  precioPorLitro?: number;
}
