import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** DTO único para el query param `dias` de los endpoints de vencimientos. */
export class DiasVencimientoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  dias: number = 30;
}
