import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CrearAusenciaDto {
  @IsString()
  tipo!: string;

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
