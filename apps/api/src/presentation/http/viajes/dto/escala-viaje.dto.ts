import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CargaEscalaDto } from './carga-escala.dto';

/** Una escala (parada) del itinerario, con sus movimientos de carga. */
export class EscalaViajeDto {
  @IsString()
  @IsNotEmpty({ message: 'La acción de la escala es obligatoria' })
  accion!: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección de la escala es obligatoria' })
  direccion!: string;

  @IsOptional()
  @IsLatitude({ message: 'lat no es una latitud válida' })
  lat?: number;

  @IsOptional()
  @IsLongitude({ message: 'lng no es una longitud válida' })
  lng?: number;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsDateString({}, { message: 'ventanaDesde debe ser una fecha ISO válida' })
  ventanaDesde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'ventanaHasta debe ser una fecha ISO válida' })
  ventanaHasta?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CargaEscalaDto)
  cargas?: CargaEscalaDto[];
}
