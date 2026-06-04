import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { NivelAptitud, TipoUnidadManejo } from '@flotaos/shared-types';

export class CrearAptitudUnidadDto {
  @IsEnum(TipoUnidadManejo, {
    message: 'El tipo de unidad no es válido',
  })
  tipoUnidad!: TipoUnidadManejo;

  @IsOptional()
  @IsEnum(NivelAptitud, {
    message: 'El nivel de aptitud no es válido',
  })
  nivel?: NivelAptitud;

  @IsOptional()
  @IsInt()
  @Min(0)
  aniosExperiencia?: number;

  @IsOptional()
  @IsString()
  notas?: string;
}
