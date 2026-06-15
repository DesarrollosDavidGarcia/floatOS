import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearCajaDto } from './crear-caja.dto';

/** Actualización parcial de una caja; permite además activar/desactivar. */
export class ActualizarCajaDto extends PartialType(CrearCajaDto) {
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
