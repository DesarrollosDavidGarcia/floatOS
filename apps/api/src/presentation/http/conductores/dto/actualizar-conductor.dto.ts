import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearConductorDto } from './crear-conductor.dto';

export class ActualizarConductorDto extends PartialType(CrearConductorDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
