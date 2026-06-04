import { IsOptional, IsString } from 'class-validator';

/**
 * Asigna o reasigna unidad y/o conductor a un viaje.
 * Enviar null no está soportado; para reasignar, manda el nuevo id.
 */
export class AsignarViajeDto {
  @IsOptional()
  @IsString()
  unidadId?: string;

  @IsOptional()
  @IsString()
  conductorId?: string;
}
