import { IsOptional, IsString } from 'class-validator';
import { PaginacionDto } from '../../shared/paginacion.dto';

export class ListarConductoresDto extends PaginacionDto {
  @IsOptional()
  @IsString()
  q?: string;
}
