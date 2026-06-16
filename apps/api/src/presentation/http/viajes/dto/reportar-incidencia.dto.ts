import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** El conductor (o admin) reporta una incidencia operativa de un viaje. */
export class ReportarIncidenciaDto {
  @IsString()
  @MaxLength(40)
  tipo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gravedad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lugar?: string;

  @IsOptional()
  @IsBoolean()
  marcarVarado?: boolean;
}
