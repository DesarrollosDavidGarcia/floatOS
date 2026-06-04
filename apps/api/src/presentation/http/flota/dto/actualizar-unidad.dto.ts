import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearUnidadDto } from './crear-unidad.dto';

/** Datos para actualizar una unidad (todos los campos opcionales). */
export class ActualizarUnidadDto extends PartialType(CrearUnidadDto) {
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
