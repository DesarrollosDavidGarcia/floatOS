import { PartialType } from '@nestjs/mapped-types';
import { CrearCatalogoItemDto } from './crear-catalogo-item.dto';

export class ActualizarCatalogoItemDto extends PartialType(
  CrearCatalogoItemDto,
) {}
