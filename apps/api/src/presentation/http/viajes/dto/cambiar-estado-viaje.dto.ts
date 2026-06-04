import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoViaje } from '@flotaos/shared-types';

/** Cambia el estado del viaje validando la transición. */
export class CambiarEstadoViajeDto {
  @IsEnum(EstadoViaje, { message: 'El estado no es un EstadoViaje válido' })
  estado!: EstadoViaje;

  @IsOptional()
  @IsString()
  nota?: string;
}
