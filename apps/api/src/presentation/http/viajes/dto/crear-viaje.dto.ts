import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
} from 'class-validator';

/** Datos para crear un viaje. Estado inicial siempre ASIGNADO. */
export class CrearViajeDto {
  @IsString()
  @IsNotEmpty({ message: 'El clienteId es obligatorio' })
  clienteId!: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección de origen es obligatoria' })
  origenDireccion!: string;

  @IsOptional()
  @IsLatitude({ message: 'origenLat no es una latitud válida' })
  origenLat?: number;

  @IsOptional()
  @IsLongitude({ message: 'origenLng no es una longitud válida' })
  origenLng?: number;

  @IsString()
  @IsNotEmpty({ message: 'La dirección de destino es obligatoria' })
  destinoDireccion!: string;

  @IsOptional()
  @IsLatitude({ message: 'destinoLat no es una latitud válida' })
  destinoLat?: number;

  @IsOptional()
  @IsLongitude({ message: 'destinoLng no es una longitud válida' })
  destinoLng?: number;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de carga es obligatorio' })
  tipoCarga!: string;

  @IsOptional()
  @IsString()
  descripcionCarga?: string;

  @IsOptional()
  @IsNumber({}, { message: 'pesoKg debe ser numérico' })
  @IsPositive({ message: 'pesoKg debe ser mayor a cero' })
  pesoKg?: number;

  @IsOptional()
  @IsString()
  dimensiones?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fechaProgramada debe ser una fecha ISO válida' })
  fechaProgramada?: string;

  @IsOptional()
  @IsString()
  unidadId?: string;

  @IsOptional()
  @IsString()
  conductorId?: string;
}
