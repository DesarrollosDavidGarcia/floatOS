import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoCertificacion } from '@flotaos/shared-types';

export class CrearCertificacionDto {
  @IsEnum(TipoCertificacion, {
    message: 'El tipo de certificación no es válido',
  })
  tipo!: TipoCertificacion;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  emisor?: string;

  @IsOptional()
  @IsString()
  folio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  fechaEmision?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  archivoKey?: string;
}
