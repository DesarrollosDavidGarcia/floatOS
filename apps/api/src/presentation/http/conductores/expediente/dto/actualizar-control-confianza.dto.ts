import { PartialType } from '@nestjs/mapped-types';
import { CrearControlConfianzaDto } from './crear-control-confianza.dto';

export class ActualizarControlConfianzaDto extends PartialType(
  CrearControlConfianzaDto,
) {}
