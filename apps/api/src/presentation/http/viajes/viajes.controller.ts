import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { PlanRutaDto } from './dto/plan-ruta.dto';
import { GestionarContactosEscalaDto } from './dto/contactos-escala.dto';
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

  /** Duplica un viaje existente (itinerario + cliente + fecha + plan). */
  @Post(':id/duplicar')
  @UseGuards(AdminGuard)
  duplicar(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    return this.viajes.duplicar(id, user.sub);
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
    // El conductor solo ve sus propios viajes, y nunca los que tienen una
    // cotización sin aceptar por el cliente (paraConductor, no aplica cuando
    // un admin filtra por conductor).
    if (user.type === 'conductor') {
      return this.viajes.listar({
        ...filtros,
        conductorId: user.sub,
        paraConductor: true,
      });
    }
    return this.viajes.listar(filtros);
  }

  /** Historial reciente de llegadas (geocercas) para la campana del panel. */
  @Get('llegadas/recientes')
  @UseGuards(AdminGuard)
  llegadasRecientes() {
    return this.viajes.llegadasRecientes();
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
  asignar(
    @Param('id') id: string,
    @Body() dto: AsignarViajeDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.viajes.asignar(id, dto, user.sub);
  }

  /** Guarda el plan multi-día del viaje (horas/día, descanso, escala, inicio). */
  @Patch(':id/plan-ruta')
  @UseGuards(AdminGuard)
  actualizarPlan(@Param('id') id: string, @Body() dto: PlanRutaDto) {
    return this.viajes.actualizarPlan(id, dto);
  }

  /**
   * Reemplaza las personas a cargo de una escala (reciben el aviso de llegada
   * por email). Requiere que el viaje tenga una cotización aceptada.
   */
  @Put(':id/escalas/:escalaId/contactos')
  @UseGuards(AdminGuard)
  gestionarContactosEscala(
    @Param('id') id: string,
    @Param('escalaId') escalaId: string,
    @Body() dto: GestionarContactosEscalaDto,
  ) {
    return this.viajes.gestionarContactosEscala(id, escalaId, dto.contactos);
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

  /** Reanuda un viaje VARADO al estado previo a la incidencia. */
  @Patch(':id/reanudar')
  reanudar(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    const conductorId = user.type === 'conductor' ? user.sub : undefined;
    return this.viajes.reanudar(id, user.sub, conductorId);
  }
}
