import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CrearEvaluacionDto {
  @IsDateString({}, { message: 'El periodo de inicio no es válido' })
  periodoInicio!: string;

  @IsDateString({}, { message: 'El periodo de fin no es válido' })
  periodoFin!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La puntuación general debe ser un número' })
  puntuacionGeneral?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La puntualidad debe ser un número' })
  puntualidad?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El consumo de combustible debe ser un número' })
  consumoCombustible?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El cumplimiento de rutas debe ser un número' })
  cumplimientoRutas?: number;

  @IsOptional()
  @IsInt({ message: 'Las incidencias del periodo deben ser un entero' })
  incidenciasPeriodo?: number;

  @IsOptional()
  @IsInt({ message: 'Los viajes completados deben ser un entero' })
  viajesCompletados?: number;

  @IsOptional()
  @IsString()
  comentarios?: string;

  @IsOptional()
  @IsString()
  evaluadoPor?: string;
}
