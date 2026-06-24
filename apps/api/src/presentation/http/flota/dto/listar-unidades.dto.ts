import { IsOptional, IsString } from 'class-validator';
import { PaginacionDto } from '../../shared/paginacion.dto';

/** Parámetros de búsqueda y paginación de unidades. */
export class ListarUnidadesDto extends PaginacionDto {
  @IsOptional()
  @IsString()
  q?: string;
}
