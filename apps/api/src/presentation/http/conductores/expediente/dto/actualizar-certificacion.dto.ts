import { PartialType } from '@nestjs/mapped-types';
import { CrearCertificacionDto } from './crear-certificacion.dto';

export class ActualizarCertificacionDto extends PartialType(
  CrearCertificacionDto,
) {}
