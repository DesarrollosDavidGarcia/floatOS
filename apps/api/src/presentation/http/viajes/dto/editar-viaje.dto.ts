import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Min,
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
  @ArrayMaxSize(50, { message: 'Máximo 50 escalas por viaje' })
  @ValidateNested({ each: true })
  @Type(() => EscalaViajeDto)
  escalas?: EscalaViajeDto[];

  @IsOptional()
  @IsDateString({}, { message: 'fechaProgramada debe ser una fecha ISO válida' })
  fechaProgramada?: string;

  @IsOptional()
  @IsIn(['CARGA', 'PERSONAL'])
  tipoServicio?: 'CARGA' | 'PERSONAL';

  @IsOptional()
  @IsInt()
  @Min(1)
  numPasajeros?: number;
}
