import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EstadoViaje } from '@flotaos/shared-types';

/** Filtros y paginación para el listado de viajes. */
export class ListarViajesDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser >= 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize debe ser un entero' })
  @Min(1, { message: 'pageSize debe ser >= 1' })
  @Max(100, { message: 'pageSize no puede exceder 100' })
  pageSize?: number;
}
