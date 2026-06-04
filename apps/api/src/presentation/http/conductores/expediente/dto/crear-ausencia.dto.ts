import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { TipoAusencia } from '@flotaos/shared-types';

export class CrearAusenciaDto {
  @IsEnum(TipoAusencia, {
    message: 'El tipo de ausencia no es válido',
  })
  tipo!: TipoAusencia;

  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  fechaInicio!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no es válida' })
  fechaFin?: string;

  @IsOptional()
  @IsInt()
  dias?: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  folioIncapacidad?: string;

  @IsOptional()
  @IsString()
  autorizadoPor?: string;

  @IsOptional()
  @IsString()
  documentoKey?: string;
}
