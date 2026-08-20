import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CatalogoItem } from '@prisma/client';
import { CatalogosUseCase } from '../../../application/catalogos/catalogos.usecase';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Catálogos de solo lectura para la app del conductor.
 *
 * El controlador principal exige rol ADMIN y los guards de clase no se pueden
 * relajar por método, así que la app tiene su propia ruta. Solo sirve los grupos
 * que necesita para capturar en campo: el resto del catálogo sigue siendo cosa
 * del panel.
 */
@Controller('catalogos-app')
@UseGuards(JwtAuthGuard)
export class CatalogosAppController {
  /** Lista blanca: lo que la app necesita para el check list y los gastos. */
  private static readonly GRUPOS_PERMITIDOS: ReadonlySet<string> = new Set([
    'CHECKLIST_UNIDAD',
    'TIPO_GASTO',
  ]);

  constructor(private readonly catalogos: CatalogosUseCase) {}

  @Get(':grupo')
  listar(@Param('grupo') grupo: string): Promise<CatalogoItem[]> {
    if (!CatalogosAppController.GRUPOS_PERMITIDOS.has(grupo)) {
      throw new ForbiddenException(
        `El catálogo ${grupo} no está disponible para la app`,
      );
    }
    // Solo activos: la app captura datos nuevos, no resuelve valores históricos.
    return this.catalogos.listar(grupo, true);
  }
}
