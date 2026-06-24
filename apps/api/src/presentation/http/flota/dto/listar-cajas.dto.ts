import { IsOptional, IsString } from 'class-validator';
import { PaginacionDto } from '../../shared/paginacion.dto';

/** Parámetros de búsqueda y paginación de cajas. */
export class ListarCajasDto extends PaginacionDto {
  @IsOptional()
  @IsString()
  q?: string;
}
