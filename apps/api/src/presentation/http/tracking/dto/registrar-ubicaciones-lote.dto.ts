import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { RegistrarUbicacionDto } from './registrar-ubicacion.dto';

/**
 * Lote de ubicaciones para sincronización offline.
 * La app del conductor acumula puntos sin señal y los envía juntos al reconectar.
 */
export class RegistrarUbicacionesLoteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'puntos debe contener al menos una ubicación' })
  @ArrayMaxSize(500, { message: 'puntos no puede exceder 500 elementos' })
  @ValidateNested({ each: true })
  @Type(() => RegistrarUbicacionDto)
  puntos!: RegistrarUbicacionDto[];
}
