import { PartialType } from '@nestjs/mapped-types';
import { CrearDocumentoConductorDto } from './crear-documento-conductor.dto';

export class ActualizarDocumentoConductorDto extends PartialType(
  CrearDocumentoConductorDto,
) {}
