import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CrearCapacitacionDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsOptional()
  @IsString()
  institucion?: string;

  @IsOptional()
  @IsInt()
  horas?: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsBoolean()
  aprobado?: boolean;

  @IsOptional()
  @IsNumber()
  calificacion?: number;

  @IsOptional()
  @IsString()
  constanciaKey?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
