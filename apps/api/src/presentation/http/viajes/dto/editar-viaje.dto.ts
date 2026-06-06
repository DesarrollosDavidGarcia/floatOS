import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { EscalaViajeDto } from './escala-viaje.dto';

/**
 * Edición de datos generales del viaje. NO cambia el estado ni la asignación.
 * Si se envían `escalas`, reemplazan por completo el itinerario actual.
 */
export class EditarViajeDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, { message: 'El itinerario requiere al menos origen y destino' })
  @ValidateNested({ each: true })
  @Type(() => EscalaViajeDto)
  escalas?: EscalaViajeDto[];

  @IsOptional()
  @IsDateString({}, { message: 'fechaProgramada debe ser una fecha ISO válida' })
  fechaProgramada?: string;
}
