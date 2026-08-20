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
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La capacidad en m³ debe ser numérica' },
  )
  @Min(0, { message: 'La capacidad en m³ no puede ser negativa' })
  capacidadM3?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El rendimiento en km/L debe ser numérico' },
  )
  @Min(0, { message: 'El rendimiento en km/L no puede ser negativo' })
  rendimientoKmL?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La capacidad del tanque debe ser numérica' },
  )
  @Min(0, { message: 'La capacidad del tanque no puede ser negativa' })
  capacidadTanqueL?: number;

  @IsOptional()
  @IsInt({ message: 'La capacidad de pasajeros debe ser un entero' })
  @Min(0, { message: 'La capacidad de pasajeros no puede ser negativa' })
  capacidadPasajeros?: number;

  // ── Costos de operación (alimentan el margen por viaje) ────────────────────

  /** Costo variable por km SIN diesel: el combustible se calcula aparte. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El costo de mantenimiento por km debe ser numérico' },
  )
  @Min(0, { message: 'El costo de mantenimiento por km no puede ser negativo' })
  costoMantenimientoPorKm?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El costo fijo mensual debe ser numérico' },
  )
  @Min(0, { message: 'El costo fijo mensual no puede ser negativo' })
  costoFijoMensual?: number;

  @IsOptional()
  @IsString()
  aseguradora?: string;

  @IsOptional()
  @IsString()
  numeroPoliza?: string;
}
