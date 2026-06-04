import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoEventoLaboral } from '@flotaos/shared-types';

export class CrearEventoLaboralDto {
  @IsEnum(TipoEventoLaboral, {
    message: 'El tipo de evento laboral no es válido',
  })
  tipo!: TipoEventoLaboral;

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
