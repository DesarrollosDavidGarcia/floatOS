import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
