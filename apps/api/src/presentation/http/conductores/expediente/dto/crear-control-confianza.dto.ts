import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CrearControlConfianzaDto {
  @IsString()
  tipo!: string;

  @IsOptional()
  @IsString()
  resultado?: string;

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
