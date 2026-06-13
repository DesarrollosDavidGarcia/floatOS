import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Parámetros de paginación reutilizables para listados sin más filtros. */
export class PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize debe ser un entero' })
  @Min(1, { message: 'pageSize debe ser mayor o igual a 1' })
  @Max(100, { message: 'pageSize no puede exceder 100' })
  pageSize?: number;
}
