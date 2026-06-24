import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Cuerpo (multipart) para enviar un mensaje de chat. El adjunto va aparte. */
export class EnviarMensajeDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  texto?: string;
}
