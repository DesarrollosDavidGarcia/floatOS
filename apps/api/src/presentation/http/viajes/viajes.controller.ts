import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ViajesService } from '../../../application/viajes/viajes.service';
import { CrearViajeDto } from './dto/crear-viaje.dto';
import { EvaluarViajeDto } from './dto/evaluar-viaje.dto';
import { ListarViajesDto } from './dto/listar-viajes.dto';
import { EditarViajeDto } from './dto/editar-viaje.dto';
import { AsignarViajeDto } from './dto/asignar-viaje.dto';
import { CambiarEstadoViajeDto } from './dto/cambiar-estado-viaje.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  AuthPrincipal,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

@Controller('viajes')
@UseGuards(JwtAuthGuard)
export class ViajesController {
  constructor(private readonly viajes: ViajesService) {}

  @Post()
  @UseGuards(AdminGuard)
  crear(@Body() dto: CrearViajeDto, @CurrentUser() user: AuthPrincipal) {
    return this.viajes.crear(dto, user.sub);
  }

  /** Motor de cálculo: evalúa un itinerario contra la flota (no persiste). */
  @Post('evaluar')
  @UseGuards(AdminGuard)
  evaluar(@Body() dto: EvaluarViajeDto) {
    return this.viajes.evaluar(dto);
  }

  @Get()
  listar(
    @Query() filtros: ListarViajesDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    // El conductor solo ve sus propios viajes.
    if (user.type === 'conductor') {
      return this.viajes.listar({ ...filtros, conductorId: user.sub });
    }
    return this.viajes.listar(filtros);
  }

  @Get(':id')
  detalle(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    if (user.type === 'conductor') {
      return this.viajes.obtenerComoConductor(id, user.sub);
    }
    return this.viajes.obtener(id);
  }

  @Get(':id/historial')
  historial(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    // El conductor solo puede ver el historial de SUS viajes.
    const conductorId = user.type === 'conductor' ? user.sub : undefined;
    return this.viajes.historial(id, conductorId);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  editar(@Param('id') id: string, @Body() dto: EditarViajeDto) {
    return this.viajes.editar(id, dto);
  }

  @Patch(':id/asignar')
  @UseGuards(AdminGuard)
  asignar(@Param('id') id: string, @Body() dto: AsignarViajeDto) {
    return this.viajes.asignar(id, dto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoViajeDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    // Admin sin restricción; el conductor solo puede avanzar SUS viajes.
    const conductorId = user.type === 'conductor' ? user.sub : undefined;
    return this.viajes.cambiarEstado(id, dto, user.sub, conductorId);
  }
}
