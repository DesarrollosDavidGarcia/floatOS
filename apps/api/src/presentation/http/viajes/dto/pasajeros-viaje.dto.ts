import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Un pasajero del manifiesto. */
export class PasajeroViajeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del pasajero es obligatorio' })
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  identificacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsString()
  escalaId?: string;
}

/** Reemplazo completo del manifiesto de pasajeros. Lista vacía = sin pasajeros. */
export class GestionarPasajerosDto {
  @IsArray()
  @ArrayMaxSize(200, { message: 'Máximo 200 pasajeros por viaje' })
  @ValidateNested({ each: true })
  @Type(() => PasajeroViajeDto)
  pasajeros!: PasajeroViajeDto[];
}
