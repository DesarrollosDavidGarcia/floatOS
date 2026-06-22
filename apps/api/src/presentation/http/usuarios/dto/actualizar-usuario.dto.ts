import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Campos editables de un usuario. Todos opcionales (actualización parcial). */
export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío' })
  @MaxLength(255)
  nombre?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'MONITORISTA'], { message: 'Rol inválido' })
  rol?: 'ADMIN' | 'MONITORISTA';

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** Si viene, restablece la contraseña del usuario. */
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password?: string;
}
