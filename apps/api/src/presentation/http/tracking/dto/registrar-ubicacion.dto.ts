import { Type } from 'class-transformer';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/** Un punto de ubicación capturado por el dispositivo del conductor. */
export class RegistrarUbicacionDto {
  @IsLatitude({ message: 'lat debe ser una latitud válida' })
  @Type(() => Number)
  lat!: number;

  @IsLongitude({ message: 'lng debe ser una longitud válida' })
  @Type(() => Number)
  lng!: number;

  @IsOptional()
  @IsNumber({}, { message: 'velocidad debe ser numérica' })
  @Min(0, { message: 'velocidad no puede ser negativa' })
  @Type(() => Number)
  velocidad?: number;

  @IsOptional()
  @IsNumber({}, { message: 'rumbo debe ser numérico' })
  @Min(0, { message: 'rumbo debe estar entre 0 y 360' })
  @Max(360, { message: 'rumbo debe estar entre 0 y 360' })
  @Type(() => Number)
  rumbo?: number;

  @IsOptional()
  @IsNumber({}, { message: 'precision debe ser numérica' })
  @Min(0, { message: 'precision no puede ser negativa' })
  @Type(() => Number)
  precision?: number;

  @IsDateString(
    {},
    { message: 'capturadoEn debe ser una fecha ISO 8601 válida' },
  )
  capturadoEn!: string;
}
