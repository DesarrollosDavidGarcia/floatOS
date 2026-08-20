import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Alta de un precio de diesel con la fecha desde la que rige. */
export class CrearPrecioDieselDto {
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'El precio por litro debe ser numérico' },
  )
  @Min(0, { message: 'El precio por litro no puede ser negativo' })
  precioPorLitro!: number;

  @IsDateString({}, { message: 'vigenteDesde debe ser una fecha ISO válida' })
  @IsNotEmpty({ message: 'La fecha de vigencia es obligatoria' })
  vigenteDesde!: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
