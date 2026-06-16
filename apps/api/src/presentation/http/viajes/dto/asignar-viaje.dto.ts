import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Asigna o reasigna unidad y/o conductor a un viaje. `null` desasigna ese campo;
 * `motivo`/`nota` documentan la reasignación (se guardan en la auditoría).
 */
export class AsignarViajeDto {
  @IsOptional()
  @IsString()
  unidadId?: string | null;

  @IsOptional()
  @IsString()
  cajaId?: string | null;

  @IsOptional()
  @IsString()
  conductorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string;
}
