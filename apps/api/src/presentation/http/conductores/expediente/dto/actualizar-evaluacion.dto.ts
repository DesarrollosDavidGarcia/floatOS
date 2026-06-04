import { PartialType } from '@nestjs/mapped-types';
import { CrearEvaluacionDto } from './crear-evaluacion.dto';

export class ActualizarEvaluacionDto extends PartialType(CrearEvaluacionDto) {}
