import { PartialType } from '@nestjs/mapped-types';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Un concepto del costo de operación: lo que cuesta y los km que dura. */
export class CrearConceptoCostoDto {
  @IsString()
  @IsNotEmpty({ message: 'El concepto es obligatorio' })
  concepto!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo debe ser numérico' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  costo!: number;

  /** Mayor a 0: dividir entre 0 km no da un costo por km, da infinito. */
  @IsInt({ message: 'La vida útil en km debe ser un entero' })
  @Min(1, { message: 'La vida útil en km debe ser mayor a 0' })
  vidaUtilKm!: number;

  @IsOptional()
  @IsString()
  notas?: string;
}

/** Edición de un concepto (todos los campos opcionales). */
export class ActualizarConceptoCostoDto extends PartialType(
  CrearConceptoCostoDto,
) {}
