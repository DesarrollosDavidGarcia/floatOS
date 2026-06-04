import { PartialType } from '@nestjs/mapped-types';
import { CrearEventoLaboralDto } from './crear-evento-laboral.dto';

export class ActualizarEventoLaboralDto extends PartialType(CrearEventoLaboralDto) {}
