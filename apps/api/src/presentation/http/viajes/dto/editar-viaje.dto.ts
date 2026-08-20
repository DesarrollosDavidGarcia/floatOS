import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Length,
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

  /** Precio acordado del viaje; null lo borra. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio acordado debe ser numérico' },
  )
  @Min(0, { message: 'El precio acordado no puede ser negativo' })
  precioAcordado?: number | null;

  @IsOptional()
  @Length(3, 3, { message: 'La moneda debe ser un código ISO de 3 letras' })
  moneda?: string;
}
