import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoExamenMedico, ResultadoExamen } from '@flotaos/shared-types';

export class CrearExamenMedicoDto {
  @IsEnum(TipoExamenMedico, {
    message: 'El tipo de examen médico no es válido',
  })
  tipo!: TipoExamenMedico;

  @IsOptional()
  @IsEnum(ResultadoExamen, {
    message: 'El resultado del examen no es válido',
  })
  resultado?: ResultadoExamen;

  @IsDateString({}, { message: 'La fecha del examen no es válida' })
  fechaExamen!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  institucion?: string;

  @IsOptional()
  @IsString()
  medico?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  archivoKey?: string;
}
