import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo del endpoint de extracción de documentos. El archivo va como multipart
 * (`archivo`); aquí solo viaja una pista opcional del tipo de documento.
 */
export class ExtraerDocumentoDto {
  /** Etiqueta del tipo de documento (del catálogo) como pista para el modelo. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tipo?: string;
}
