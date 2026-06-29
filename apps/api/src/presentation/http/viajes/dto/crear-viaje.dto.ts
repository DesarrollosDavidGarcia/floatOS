import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
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
  @ArrayMaxSize(50, { message: 'Máximo 50 escalas por viaje' })
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

  @IsOptional()
  @IsIn(['CARGA', 'PERSONAL'])
  tipoServicio?: 'CARGA' | 'PERSONAL';

  @IsOptional()
  @IsInt()
  @Min(1)
  numPasajeros?: number;
}
