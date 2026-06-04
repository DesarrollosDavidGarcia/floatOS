import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LoginAdminUseCase } from '../../../application/auth/login-admin.usecase';
import { LoginConductorUseCase } from '../../../application/auth/login-conductor.usecase';
import { RefreshTokenUseCase } from '../../../application/auth/refresh-token.usecase';
import { LogoutUseCase } from '../../../application/auth/logout.usecase';
import { GetMeUseCase } from '../../../application/auth/get-me.usecase';
import {
  AuthResponse,
  PrincipalPublico,
} from '../../../application/auth/auth.types';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LoginConductorDto } from './dto/login-conductor.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  AuthPrincipal,
  CurrentUser,
} from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginAdmin: LoginAdminUseCase,
    private readonly loginConductor: LoginConductorUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getMe: GetMeUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  loginAdminHandler(@Body() dto: LoginAdminDto): Promise<AuthResponse> {
    return this.loginAdmin.execute(dto.email, dto.password);
  }

  @Post('conductor/login')
  @HttpCode(HttpStatus.OK)
  loginConductorHandler(
    @Body() dto: LoginConductorDto,
  ): Promise<AuthResponse> {
    return this.loginConductor.execute(dto.usuario, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshHandler(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.refreshToken.execute(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logoutHandler(@CurrentUser() user: AuthPrincipal): Promise<void> {
    await this.logout.execute(user.sub, user.type);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  meHandler(@CurrentUser() user: AuthPrincipal): Promise<PrincipalPublico> {
    return this.getMe.execute(user.sub, user.type);
  }
}
