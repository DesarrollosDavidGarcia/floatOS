import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosUseCase } from '../../../application/usuarios/usuarios.usecase';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosUseCase],
})
export class UsuariosModule {}
