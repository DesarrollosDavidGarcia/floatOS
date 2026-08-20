import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CrearConductorDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsString()
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  usuario!: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  // ── Campos de Recursos Humanos ──────────────────────────────────────────────

  @IsOptional()
  @IsString()
  curp?: string;

  @IsOptional()
  @IsString()
  rfc?: string;

  @IsOptional()
  @IsString()
  nss?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  tipoSangre?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  numeroEmpleado?: string;

  @IsOptional()
  @IsString()
  puesto?: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsString()
  categoriaLicencia?: string;

  @IsOptional()
  @IsString()
  emergenciaNombre?: string;

  @IsOptional()
  @IsString()
  emergenciaTelefono?: string;

  @IsOptional()
  @IsString()
  emergenciaRelacion?: string;

  // ── Contratación (planta / freelance / terciarizado) ──────────────────────────

  @IsOptional()
  @IsString()
  tipoContratacion?: string;

  @IsOptional()
  @IsString()
  empresaProveedor?: string;

  @IsOptional()
  @IsString()
  empresaProveedorRfc?: string;

  @IsOptional()
  @IsString()
  proveedorContactoNombre?: string;

  @IsOptional()
  @IsString()
  proveedorContactoTelefono?: string;

  @IsOptional()
  @IsDateString()
  vigenciaDesde?: string;

  @IsOptional()
  @IsDateString()
  vigenciaHasta?: string;

  @IsOptional()
  @IsString()
  notasContratacion?: string;

  // ── Pago (componentes; se aplica cada uno que venga con valor) ─────────────

  /** Sueldo fijo del periodo; se prorratea entre los viajes de ese periodo. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El sueldo del periodo debe ser numérico' },
  )
  @Min(0, { message: 'El sueldo del periodo no puede ser negativo' })
  sueldoPeriodo?: number;

  /** Catálogo PERIODICIDAD_SUELDO. Obligatorio si se manda sueldoPeriodo. */
  @IsOptional()
  @IsString()
  periodicidadSueldo?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La tarifa por viaje debe ser numérica' },
  )
  @Min(0, { message: 'La tarifa por viaje no puede ser negativa' })
  tarifaPorViaje?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El pago por km debe ser numérico' },
  )
  @Min(0, { message: 'El pago por km no puede ser negativo' })
  pagoPorKm?: number;

  /** Porcentaje sobre el precio acordado del viaje. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El porcentaje del flete debe ser numérico' },
  )
  @Min(0, { message: 'El porcentaje del flete no puede ser negativo' })
  @Max(100, { message: 'El porcentaje del flete no puede pasar de 100' })
  porcentajeFlete?: number;
}
