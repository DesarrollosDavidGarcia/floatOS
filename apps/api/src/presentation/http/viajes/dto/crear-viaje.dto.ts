import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
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

  /**
   * Precio acordado con el cliente. Es el ingreso del viaje: sin él no hay
   * margen calculable. Si el viaje nace de una cotización aceptada se copia
   * solo; aquí se captura cuando el viaje se da de alta directo.
   */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio acordado debe ser numérico' },
  )
  @Min(0, { message: 'El precio acordado no puede ser negativo' })
  precioAcordado?: number;

  @IsOptional()
  @Length(3, 3, { message: 'La moneda debe ser un código ISO de 3 letras' })
  moneda?: string;
}
