import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from '../../../application/auth/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ConductorGuard } from './guards/conductor.guard';
import { LoginAdminUseCase } from '../../../application/auth/login-admin.usecase';
import { LoginConductorUseCase } from '../../../application/auth/login-conductor.usecase';
import { RefreshTokenUseCase } from '../../../application/auth/refresh-token.usecase';
import { LogoutUseCase } from '../../../application/auth/logout.usecase';
import { GetMeUseCase } from '../../../application/auth/get-me.usecase';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // La configuración de firma se pasa por operación en AuthService.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    ConductorGuard,
    LoginAdminUseCase,
    LoginConductorUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetMeUseCase,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    ConductorGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
