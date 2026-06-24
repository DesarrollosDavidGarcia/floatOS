import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Entrada para calcular distancia entre dos direcciones de texto. */
export class DistanciaBotDto {
  @IsString() @IsNotEmpty() origen!: string;
  @IsString() @IsNotEmpty() destino!: string;
}

/** Entrada del bot para cotizar: direcciones de texto + carga. */
export class CotizarBotDto {
  @IsString() @IsNotEmpty() origen!: string;
  @IsString() @IsNotEmpty() destino!: string;
  @IsNumber() @Min(0) pesoKg!: number;
  @IsOptional() @IsInt() @Min(0) numEscalas?: number;
}
