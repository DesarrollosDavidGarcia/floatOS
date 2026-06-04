import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoIncidencia, GravedadIncidencia } from '@flotaos/shared-types';

export class CrearIncidenciaDto {
  @IsEnum(TipoIncidencia, { message: 'El tipo de incidencia no es válido' })
  tipo!: TipoIncidencia;

  @IsOptional()
  @IsEnum(GravedadIncidencia, { message: 'La gravedad no es válida' })
  gravedad?: GravedadIncidencia;

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
