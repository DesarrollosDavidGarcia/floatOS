import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoControlConfianza, ResultadoExamen } from '@flotaos/shared-types';

export class CrearControlConfianzaDto {
  @IsEnum(TipoControlConfianza, {
    message: 'El tipo de control de confianza no es válido',
  })
  tipo!: TipoControlConfianza;

  @IsOptional()
  @IsEnum(ResultadoExamen, {
    message: 'El resultado del examen no es válido',
  })
  resultado?: ResultadoExamen;

  @IsOptional()
  @IsString()
  institucion?: string;

  @IsOptional()
  @IsString()
  folio?: string;

  @IsDateString({}, { message: 'La fecha de evaluación no es válida' })
  fechaEvaluacion!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  archivoKey?: string;
}
