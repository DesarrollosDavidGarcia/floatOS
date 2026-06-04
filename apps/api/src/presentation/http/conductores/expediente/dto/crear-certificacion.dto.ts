import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CrearCertificacionDto {
  @IsString()
  tipo!: string;

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
