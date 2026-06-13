import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CrearDocumentoConductorDto {
  @IsString()
  tipo!: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  fechaEmision?: string;

  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  fechaVencimiento!: string;
}
