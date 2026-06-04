import { PartialType } from '@nestjs/mapped-types';
import { CrearExamenMedicoDto } from './crear-examen-medico.dto';

export class ActualizarExamenMedicoDto extends PartialType(
  CrearExamenMedicoDto,
) {}
