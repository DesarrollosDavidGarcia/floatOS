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
import { Cliente } from '@prisma/client';
import { Paginado } from '@flotaos/shared-types';
import { CrearClienteUseCase } from '../../../application/clientes/crear-cliente.usecase';
import { ListarClientesUseCase } from '../../../application/clientes/listar-clientes.usecase';
import { ObtenerClienteUseCase } from '../../../application/clientes/obtener-cliente.usecase';
import { ActualizarClienteUseCase } from '../../../application/clientes/actualizar-cliente.usecase';
import { EliminarClienteUseCase } from '../../../application/clientes/eliminar-cliente.usecase';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { ListarClientesDto } from './dto/listar-clientes.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ClientesController {
  constructor(
    private readonly crearCliente: CrearClienteUseCase,
    private readonly listarClientes: ListarClientesUseCase,
    private readonly obtenerCliente: ObtenerClienteUseCase,
    private readonly actualizarCliente: ActualizarClienteUseCase,
    private readonly eliminarCliente: EliminarClienteUseCase,
  ) {}

  @Post()
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
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarClienteDto,
  ): Promise<Cliente> {
    return this.actualizarCliente.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string): Promise<void> {
    await this.eliminarCliente.execute(id);
  }
}
