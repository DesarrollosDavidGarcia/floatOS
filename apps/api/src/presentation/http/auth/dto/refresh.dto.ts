import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: 'El refreshToken es obligatorio' })
  refreshToken!: string;
}
