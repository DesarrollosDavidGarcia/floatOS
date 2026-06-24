import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Query params (opcionales) para paginar el historial de chat por cursor. */
export class ListarChatQueryDto {
  /** Tamaño de página (1..100). Por defecto lo decide el caso de uso. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Cursor: id del mensaje más antiguo ya cargado (pide la página anterior). */
  @IsOptional()
  @IsString()
  cursor?: string;
}
