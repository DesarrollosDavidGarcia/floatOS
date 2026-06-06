import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EscalaViajeDto } from './escala-viaje.dto';

/**
 * Crear un viaje con su itinerario de escalas. El origen es la primera escala y
 * el destino la última (mínimo 2). Estado inicial siempre ASIGNADO.
 */
export class CrearViajeDto {
  @IsString()
  @IsNotEmpty({ message: 'El clienteId es obligatorio' })
  clienteId!: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'El itinerario requiere al menos origen y destino' })
  @ValidateNested({ each: true })
  @Type(() => EscalaViajeDto)
  escalas!: EscalaViajeDto[];

  @IsOptional()
  @IsDateString({}, { message: 'fechaProgramada debe ser una fecha ISO válida' })
  fechaProgramada?: string;

  @IsOptional()
  @IsString()
  unidadId?: string;

  @IsOptional()
  @IsString()
  conductorId?: string;
}
