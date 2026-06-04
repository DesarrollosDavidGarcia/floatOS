import { PartialType } from '@nestjs/mapped-types';
import { CrearIncidenciaDto } from './crear-incidencia.dto';

export class ActualizarIncidenciaDto extends PartialType(CrearIncidenciaDto) {}
