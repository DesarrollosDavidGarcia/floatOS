import { PartialType } from '@nestjs/mapped-types';
import { CrearAptitudUnidadDto } from './crear-aptitud-unidad.dto';

export class ActualizarAptitudUnidadDto extends PartialType(CrearAptitudUnidadDto) {}
