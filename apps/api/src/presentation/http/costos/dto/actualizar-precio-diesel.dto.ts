import { PartialType } from '@nestjs/mapped-types';
import { CrearPrecioDieselDto } from './crear-precio-diesel.dto';

/** Edición de un precio de diesel (todos los campos opcionales). */
export class ActualizarPrecioDieselDto extends PartialType(
  CrearPrecioDieselDto,
) {}
