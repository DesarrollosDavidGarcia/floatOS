import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/**
 * Edición de datos generales del viaje. NO permite cambiar el estado
 * (eso va por PATCH /viajes/:id/estado) ni la asignación de unidad/conductor
 * (eso va por PATCH /viajes/:id/asignar). Todos los campos son opcionales.
 */
export class EditarViajeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La dirección de origen no puede estar vacía' })
  origenDireccion?: string;

  @IsOptional()
  @IsLatitude({ message: 'origenLat no es una latitud válida' })
  origenLat?: number;

  @IsOptional()
  @IsLongitude({ message: 'origenLng no es una longitud válida' })
  origenLng?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La dirección de destino no puede estar vacía' })
  destinoDireccion?: string;

  @IsOptional()
  @IsLatitude({ message: 'destinoLat no es una latitud válida' })
  destinoLat?: number;

  @IsOptional()
  @IsLongitude({ message: 'destinoLng no es una longitud válida' })
  destinoLng?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El tipo de carga no puede estar vacío' })
  tipoCarga?: string;

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
}
