import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CrearEventoLaboralDto {
  @IsString()
  tipo!: string;

  @IsString()
  titulo!: string;

  @IsDateString({}, { message: 'La fecha del evento no es válida' })
  fecha!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  puestoNuevo?: string;

  @IsOptional()
  @IsString()
  registradoPor?: string;
}
