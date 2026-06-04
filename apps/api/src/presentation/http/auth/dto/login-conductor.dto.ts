import { IsNotEmpty, IsString } from 'class-validator';

export class LoginConductorDto {
  @IsString()
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  usuario!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}
