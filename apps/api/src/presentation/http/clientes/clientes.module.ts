import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { CrearClienteUseCase } from '../../../application/clientes/crear-cliente.usecase';
import { ListarClientesUseCase } from '../../../application/clientes/listar-clientes.usecase';
import { ObtenerClienteUseCase } from '../../../application/clientes/obtener-cliente.usecase';
import { ActualizarClienteUseCase } from '../../../application/clientes/actualizar-cliente.usecase';
import { EliminarClienteUseCase } from '../../../application/clientes/eliminar-cliente.usecase';

@Module({
  controllers: [ClientesController],
  providers: [
    CrearClienteUseCase,
    ListarClientesUseCase,
    ObtenerClienteUseCase,
    ActualizarClienteUseCase,
    EliminarClienteUseCase,
  ],
  exports: [
    CrearClienteUseCase,
    ListarClientesUseCase,
    ObtenerClienteUseCase,
    ActualizarClienteUseCase,
    EliminarClienteUseCase,
  ],
})
export class ClientesModule {}
