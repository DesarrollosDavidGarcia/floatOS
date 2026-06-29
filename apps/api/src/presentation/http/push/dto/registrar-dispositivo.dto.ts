import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrarDispositivoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;

  @IsOptional()
  @IsIn(['android', 'ios'])
  plataforma?: string;
}

export class BajaDispositivoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;
}
