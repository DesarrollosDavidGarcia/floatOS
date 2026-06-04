import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearCatalogoItemDto {
  @IsString()
  @MaxLength(80)
  codigo!: string;

  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
