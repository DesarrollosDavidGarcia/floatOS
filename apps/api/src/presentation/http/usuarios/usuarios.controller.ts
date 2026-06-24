import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsuariosUseCase } from '../../../application/usuarios/usuarios.usecase';
import { UsuarioPublico } from '../../../application/auth/auth.types';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthPrincipal,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

/** ABM de usuarios del panel. Solo administradores. */
@Controller('usuarios')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosUseCase) {}

  @Get()
  listar(): Promise<UsuarioPublico[]> {
    return this.usuarios.listar();
  }

  @Post()
  crear(@Body() dto: CrearUsuarioDto): Promise<UsuarioPublico> {
    return this.usuarios.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @CurrentUser() actor: AuthPrincipal,
  ): Promise<UsuarioPublico> {
    return this.usuarios.actualizar(id, dto, actor.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id') id: string,
    @CurrentUser() actor: AuthPrincipal,
  ): Promise<void> {
    await this.usuarios.eliminar(id, actor.sub);
  }
}
