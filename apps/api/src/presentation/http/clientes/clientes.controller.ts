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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cliente, SucursalCliente } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { CrearClienteUseCase } from '../../../application/clientes/crear-cliente.usecase';
import { ListarClientesUseCase } from '../../../application/clientes/listar-clientes.usecase';
import { ObtenerClienteUseCase } from '../../../application/clientes/obtener-cliente.usecase';
import { ActualizarClienteUseCase } from '../../../application/clientes/actualizar-cliente.usecase';
import { EliminarClienteUseCase } from '../../../application/clientes/eliminar-cliente.usecase';
import { SucursalesClienteUseCase } from '../../../application/clientes/sucursales-cliente.usecase';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { ListarClientesDto } from './dto/listar-clientes.dto';
import { CrearSucursalDto, ActualizarSucursalDto } from './dto/sucursal-cliente.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ClientesController {
  constructor(
    private readonly crearCliente: CrearClienteUseCase,
    private readonly listarClientes: ListarClientesUseCase,
    private readonly obtenerCliente: ObtenerClienteUseCase,
    private readonly actualizarCliente: ActualizarClienteUseCase,
    private readonly eliminarCliente: EliminarClienteUseCase,
    private readonly sucursales: SucursalesClienteUseCase,
  ) {}

  @Post()
  @Roles('ADMIN')
  crear(@Body() dto: CrearClienteDto): Promise<Cliente> {
    return this.crearCliente.execute(dto);
  }

  @Get()
  listar(@Query() query: ListarClientesDto): Promise<Paginado<Cliente>> {
    return this.listarClientes.execute(query);
  }

  @Get(':id')
  detalle(@Param('id') id: string): Promise<Cliente> {
    return this.obtenerCliente.execute(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarClienteDto,
  ): Promise<Cliente> {
    return this.actualizarCliente.execute(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.eliminarCliente.execute(id);
  }

  // ─────────────────── Sucursales de un cliente ───────────────────

  @Get(':clienteId/sucursales')
  listarSucursales(
    @Param('clienteId') clienteId: string,
  ): Promise<SucursalCliente[]> {
    return this.sucursales.listar(clienteId);
  }

  @Post(':clienteId/sucursales')
  @Roles('ADMIN')
  crearSucursal(
    @Param('clienteId') clienteId: string,
    @Body() dto: CrearSucursalDto,
  ): Promise<SucursalCliente> {
    return this.sucursales.crear(clienteId, dto);
  }

  @Patch(':clienteId/sucursales/:sucursalId')
  @Roles('ADMIN')
  actualizarSucursal(
    @Param('clienteId') clienteId: string,
    @Param('sucursalId') sucursalId: string,
    @Body() dto: ActualizarSucursalDto,
  ): Promise<SucursalCliente> {
    return this.sucursales.actualizar(clienteId, sucursalId, dto);
  }

  @Delete(':clienteId/sucursales/:sucursalId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarSucursal(
    @Param('clienteId') clienteId: string,
    @Param('sucursalId') sucursalId: string,
  ): Promise<void> {
    await this.sucursales.eliminar(clienteId, sucursalId);
  }
}
