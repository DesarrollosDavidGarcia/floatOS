import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  /**
   * Token de refresh para clientes bearer (app móvil). El panel web lo omite:
   * el token viaja en la cookie httpOnly `flotaos_refresh`.
   */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
