import { PartialType } from '@nestjs/mapped-types';
import { CrearDocumentoUnidadDto } from './crear-documento-unidad.dto';

/** Datos para actualizar un documento de una unidad (campos opcionales). */
export class ActualizarDocumentoUnidadDto extends PartialType(
  CrearDocumentoUnidadDto,
) {}
