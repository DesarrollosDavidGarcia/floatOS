import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Tarifas/parámetros capturados para la cotización (modelo mixto configurable). */
export class ParamsCotizacionDto {
  @IsNumber() @Min(0) tarifaBase!: number;
  @IsNumber() @Min(0) precioPorKm!: number;
  @IsNumber() @Min(0) precioPorKg!: number;
  @IsNumber() @Min(0) precioDiesel!: number;
  @IsNumber() @Min(0) rendimientoKmL!: number;
  @IsNumber() @Min(0) casetas!: number;
  @IsNumber() @Min(0) maniobrasPorEscala!: number;
  @IsNumber() @Min(0) @Max(500) margenPct!: number;
  @IsBoolean() aplicaIva!: boolean;
  @IsBoolean() aplicaRetencion!: boolean;
}

/** Datos del viaje para la previsualización (el create los toma del viaje). */
export class DatosCotizacionDto {
  @IsNumber() @Min(0) distanciaKm!: number;
  @IsNumber() @Min(0) pesoKg!: number;
  @IsInt() @Min(0) numEscalas!: number;
}

/** Previsualización (no persiste): params + datos del viaje. */
export class CalcularCotizacionDto {
  @ValidateNested() @Type(() => ParamsCotizacionDto) params!: ParamsCotizacionDto;
  @ValidateNested() @Type(() => DatosCotizacionDto) datos!: DatosCotizacionDto;
}

/** Crear cotización de un viaje: params + nota; los datos salen del viaje. */
export class CrearCotizacionDto {
  @ValidateNested() @Type(() => ParamsCotizacionDto) params!: ParamsCotizacionDto;
  @IsOptional() @IsString() notas?: string;
}
