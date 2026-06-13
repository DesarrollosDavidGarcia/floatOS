import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

/** Un movimiento de carga (recoger/entregar) dentro de una escala. */
export class CargaEscalaDto {
  @IsIn(['CARGA', 'DESCARGA'], { message: 'sentido debe ser CARGA o DESCARGA' })
  sentido!: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de carga es obligatorio' })
  tipoCarga!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber({}, { message: 'pesoKg debe ser numérico' })
  @IsPositive({ message: 'pesoKg debe ser mayor a cero' })
  pesoKg!: number;

  @IsOptional()
  @IsNumber({}, { message: 'volumenM3 debe ser numérico' })
  @Min(0)
  volumenM3?: number;

  @IsOptional()
  @IsNumber({}, { message: 'largoM debe ser numérico' })
  @Min(0)
  largoM?: number;

  @IsOptional()
  @IsNumber({}, { message: 'anchoM debe ser numérico' })
  @Min(0)
  anchoM?: number;

  @IsOptional()
  @IsNumber({}, { message: 'altoM debe ser numérico' })
  @Min(0)
  altoM?: number;

  @IsOptional()
  @IsInt({ message: 'cantidad debe ser un entero' })
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsString()
  loteRef?: string;
}
