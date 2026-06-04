import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoDocumentoUnidad } from '@flotaos/shared-types';

/** Datos para registrar un documento de una unidad. */
export class CrearDocumentoUnidadDto {
  @IsEnum(TipoDocumentoUnidad, {
    message: 'El tipo de documento no es válido',
  })
  tipo!: TipoDocumentoUnidad;

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
