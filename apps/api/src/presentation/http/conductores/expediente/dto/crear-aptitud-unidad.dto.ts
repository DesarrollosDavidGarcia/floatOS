import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CrearAptitudUnidadDto {
  @IsString()
  tipoUnidad!: string;

  @IsOptional()
  @IsString()
  nivel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  aniosExperiencia?: number;

  @IsOptional()
  @IsString()
  notas?: string;
}
