import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoViaje } from '@flotaos/shared-types';
import { PaginacionDto } from '../../shared/paginacion.dto';

/** Filtros y paginación para el listado de viajes. */
export class ListarViajesDto extends PaginacionDto {
  @IsOptional()
  @IsEnum(EstadoViaje, { message: 'estado no es un EstadoViaje válido' })
  estado?: EstadoViaje;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  conductorId?: string;

  @IsOptional()
  @IsString()
  unidadId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha ISO válida' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha ISO válida' })
  hasta?: string;

  /** Búsqueda libre por folio, direcciones o tipo de carga. */
  @IsOptional()
  @IsString()
  q?: string;
}
