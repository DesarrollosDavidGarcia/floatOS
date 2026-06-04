import { PartialType } from '@nestjs/mapped-types';
import { CrearClienteDto } from './crear-cliente.dto';

/** Actualización parcial de un cliente. Todos los campos son opcionales. */
export class ActualizarClienteDto extends PartialType(CrearClienteDto) {}
