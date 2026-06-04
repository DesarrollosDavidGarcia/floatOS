import { PartialType } from '@nestjs/mapped-types';
import { CrearCapacitacionDto } from './crear-capacitacion.dto';

export class ActualizarCapacitacionDto extends PartialType(CrearCapacitacionDto) {}
