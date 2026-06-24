import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Tarifas por defecto para la cotización del bot (forma de ParamsCotizacion). */
export class TarifasCotizacionDto {
  @IsOptional() @IsNumber() @Min(0) tarifaBase?: number;
  @IsOptional() @IsNumber() @Min(0) precioPorKm?: number;
  @IsOptional() @IsNumber() @Min(0) precioPorKg?: number;
  @IsOptional() @IsNumber() @Min(0) precioDiesel?: number;
  @IsOptional() @IsNumber() @Min(0) rendimientoKmL?: number;
  @IsOptional() @IsNumber() @Min(0) casetas?: number;
  @IsOptional() @IsNumber() @Min(0) maniobrasPorEscala?: number;
  @IsOptional() @IsNumber() @Min(0) margenPct?: number;
  @IsOptional() @IsBoolean() aplicaIva?: boolean;
  @IsOptional() @IsBoolean() aplicaRetencion?: boolean;
}

/** Actualización de la configuración de empresa. Todo opcional (PATCH parcial). */
export class ActualizarEmpresaDto {
  @IsOptional() @IsString() @MaxLength(300) razonSocial?: string;
  @IsOptional() @IsString() @MaxLength(13) rfc?: string;
  @IsOptional() @IsString() regimenFiscal?: string;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string;
  @IsOptional() @IsEmail({}, { message: 'El email no es válido' }) email?: string;

  // Domicilio fiscal
  @IsOptional() @IsString() calle?: string;
  @IsOptional() @IsString() numeroExt?: string;
  @IsOptional() @IsString() numeroInt?: string;
  @IsOptional() @IsString() colonia?: string;
  @IsOptional() @IsString() @MaxLength(5) cp?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() pais?: string;

  // Carta Porte (emisor / autotransporte)
  @IsOptional() @IsString() permisoSctTipo?: string;
  @IsOptional() @IsString() permisoSctNumero?: string;
  @IsOptional() @IsString() aseguradoraRespCivil?: string;
  @IsOptional() @IsString() polizaRespCivil?: string;

  // PAC / timbrado
  @IsOptional() @IsString() pacProveedor?: string;
  @IsOptional() @IsString() pacAmbiente?: string;
  @IsOptional() @IsString() pacUsuario?: string;
  @IsOptional() @IsString() pacToken?: string;
  @IsOptional() @IsString() pacPassword?: string;

  // CSD
  @IsOptional() @IsString() csdNumero?: string;
  @IsOptional() @IsString() csdPassword?: string;

  // Tarifas por defecto del bot de cotización (n8n)
  @IsOptional()
  @ValidateNested()
  @Type(() => TarifasCotizacionDto)
  tarifasCotizacion?: TarifasCotizacionDto;
}
