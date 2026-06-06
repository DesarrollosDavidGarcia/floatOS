import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EscalaViajeDto } from './escala-viaje.dto';

/**
 * Evaluación del motor de cálculo para un itinerario (aún no persistido). Si
 * `unidadIds` se omite, se evalúan todas las unidades activas.
 */
export class EvaluarViajeDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Se requiere al menos una escala' })
  @ArrayMaxSize(50, { message: 'Máximo 50 escalas' })
  @ValidateNested({ each: true })
  @Type(() => EscalaViajeDto)
  escalas!: EscalaViajeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unidadIds?: string[];
}
