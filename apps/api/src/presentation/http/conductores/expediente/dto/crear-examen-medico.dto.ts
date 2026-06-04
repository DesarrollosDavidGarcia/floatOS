import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CrearExamenMedicoDto {
  @IsString()
  tipo!: string;

  @IsOptional()
  @IsString()
  resultado?: string;

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
