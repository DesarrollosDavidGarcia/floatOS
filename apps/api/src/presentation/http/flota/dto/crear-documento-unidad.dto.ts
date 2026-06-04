import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Datos para registrar un documento de una unidad. */
export class CrearDocumentoUnidadDto {
  @IsString()
  tipo!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  fechaEmision?: string;

  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  fechaVencimiento!: string;

  @IsOptional()
  @IsString()
  archivoKey?: string;
}
