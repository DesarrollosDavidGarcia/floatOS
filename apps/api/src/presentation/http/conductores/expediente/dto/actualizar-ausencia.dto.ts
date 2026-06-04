import { PartialType } from '@nestjs/mapped-types';
import { CrearAusenciaDto } from './crear-ausencia.dto';

export class ActualizarAusenciaDto extends PartialType(CrearAusenciaDto) {}
