import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CrearIncidenciaDto {
  @IsString()
  tipo!: string;

  @IsOptional()
  @IsString()
  gravedad?: string;

  @IsString()
  titulo!: string;

  @IsDateString({}, { message: 'La fecha no es válida' })
  fecha!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  lugar?: string;

  @IsOptional()
  @IsString()
  evidenciaKey?: string;

  @IsOptional()
  @IsString()
  registradoPor?: string;

  @IsOptional()
  @IsString()
  viajeId?: string;

  @IsOptional()
  @IsNumber()
  costoEstimado?: number;

  @IsOptional()
  @IsBoolean()
  resuelta?: boolean;
}
