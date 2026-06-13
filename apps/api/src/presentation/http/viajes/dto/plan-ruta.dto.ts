import { IsInt, Max, Min } from 'class-validator';

/**
 * Plan multi-día que asigna el monitorista para estimar la fecha de llegada:
 * horas de conducción/día, descanso entre días, tiempo por escala y hora de
 * inicio diaria. Todos obligatorios (la UI envía los valores actuales o defaults).
 */
export class PlanRutaDto {
  @IsInt()
  @Min(1, { message: 'Las horas de conducción/día deben ser al menos 1' })
  @Max(24)
  horasConduccionDia!: number;

  @IsInt()
  @Min(0)
  @Max(24)
  horasDescanso!: number;

  @IsInt()
  @Min(0)
  @Max(600, { message: 'El tiempo por escala no puede superar 600 min' })
  minutosPorEscala!: number;

  @IsInt()
  @Min(0)
  @Max(23, { message: 'La hora de inicio debe estar entre 0 y 23' })
  horaInicio!: number;
}
