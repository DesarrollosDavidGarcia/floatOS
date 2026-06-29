import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoCotizacion } from '@prisma/client';

/**
 * Tarifas/parámetros capturados para la cotización (modelo mixto configurable).
 * Los topes superiores son sanity-checks contra capturas erróneas (no límites de
 * negocio): frenan typos absurdos sin estorbar valores reales de flete.
 */
export class ParamsCotizacionDto {
  @IsOptional() @IsIn(['CARGA', 'PERSONAL']) tipoServicio?: 'CARGA' | 'PERSONAL';
  @IsNumber() @Min(0) @Max(10_000_000) tarifaBase!: number;
  @IsNumber() @Min(0) @Max(100_000) precioPorKm!: number;
  @IsNumber() @Min(0) @Max(100_000) precioPorKg!: number;
  @IsNumber() @Min(0) @Max(1_000) precioDiesel!: number;
  @IsNumber() @Min(0) @Max(100) rendimientoKmL!: number;
  @IsNumber() @Min(0) @Max(1_000_000) casetas!: number;
  @IsNumber() @Min(0) @Max(1_000_000) maniobrasPorEscala!: number;
  // Personal:
  @IsOptional()
  @IsIn(['POR_VIAJE', 'POR_KM', 'POR_PASAJERO'])
  modoPrecio?: 'POR_VIAJE' | 'POR_KM' | 'POR_PASAJERO';
  @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) precioPorPasajero?: number;
  @IsNumber() @Min(0) @Max(500) margenPct!: number;
  @IsBoolean() aplicaIva!: boolean;
  @IsBoolean() aplicaRetencion!: boolean;
}

/** Datos del viaje para la previsualización (el create los toma del viaje). */
export class DatosCotizacionDto {
  @IsNumber() @Min(0) distanciaKm!: number;
  @IsNumber() @Min(0) pesoKg!: number;
  @IsOptional() @IsInt() @Min(0) numPasajeros?: number;
  @IsInt() @Min(0) numEscalas!: number;
}

/** Previsualización (no persiste): params + datos del viaje. */
export class CalcularCotizacionDto {
  @ValidateNested() @Type(() => ParamsCotizacionDto) params!: ParamsCotizacionDto;
  @ValidateNested() @Type(() => DatosCotizacionDto) datos!: DatosCotizacionDto;
}

/** Crear cotización de un viaje: params + nota; los datos salen del viaje. */
export class CrearCotizacionDto {
  @ValidateNested() @Type(() => ParamsCotizacionDto) params!: ParamsCotizacionDto;
  @IsOptional() @IsString() notas?: string;
}

/** Enviar cotización por correo. Si `to` se omite/vacío, usa el correo del cliente. */
export class EnviarCotizacionDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Máximo 20 destinatarios' })
  @IsEmail({}, { each: true, message: 'Correo destino inválido' })
  to?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Máximo 20 en copia' })
  @IsEmail({}, { each: true, message: 'Correo en copia inválido' })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Máximo 20 en copia oculta' })
  @IsEmail({}, { each: true, message: 'Correo en copia oculta inválido' })
  bcc?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'El asunto no puede exceder 300 caracteres' })
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000, { message: 'El mensaje no puede exceder 5000 caracteres' })
  mensaje?: string;
}

/** Cambia el estado de una cotización (Aceptada/Rechazada/reabrir a Enviada). */
export class CambiarEstadoCotizacionDto {
  @IsIn([
    EstadoCotizacion.ENVIADA,
    EstadoCotizacion.ACEPTADA,
    EstadoCotizacion.RECHAZADA,
  ])
  estado!: EstadoCotizacion;
}
