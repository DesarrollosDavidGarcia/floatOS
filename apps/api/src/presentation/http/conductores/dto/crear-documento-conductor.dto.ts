import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoDocumentoConductor } from '@flotaos/shared-types';

export class CrearDocumentoConductorDto {
  @IsEnum(TipoDocumentoConductor, {
    message: 'El tipo de documento no es válido',
  })
  tipo!: TipoDocumentoConductor;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  fechaEmision?: string;

  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  fechaVencimiento!: string;

  @IsOptional()
  @IsString()
  archivoKey?: string;
}
