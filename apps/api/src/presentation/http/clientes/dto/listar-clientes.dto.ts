import { IsOptional, IsString } from 'class-validator';
import { PaginacionDto } from '../../shared/paginacion.dto';

/** Parámetros de búsqueda y paginación para el listado de clientes. */
export class ListarClientesDto extends PaginacionDto {
  /** Texto de búsqueda por razón social o RFC. */
  @IsOptional()
  @IsString()
  q?: string;
}
