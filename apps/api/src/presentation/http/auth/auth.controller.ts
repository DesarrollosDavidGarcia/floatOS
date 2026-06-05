import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
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
import {
  COOKIE_REFRESH,
  clearAuthCookies,
  leerCookie,
  setAuthCookies,
} from './cookies';

/** Anti fuerza bruta en login: 10 intentos/min por IP. */
const THROTTLE_LOGIN = { default: { limit: 10, ttl: 60_000 } };
/** Refresh legítimo (web/app renuevan a menudo): 30/min por IP. */
const THROTTLE_REFRESH = { default: { limit: 30, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginAdmin: LoginAdminUseCase,
    private readonly loginConductor: LoginConductorUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getMe: GetMeUseCase,
  ) {}

  // Anti fuerza bruta: 10 intentos por minuto por IP.
  // Los handlers de login/refresh setean cookies httpOnly para el panel web y
  // además devuelven los tokens en el body para la app móvil (bearer).
  @Throttle(THROTTLE_LOGIN)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginAdminHandler(
    @Body() dto: LoginAdminDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.loginAdmin.execute(dto.email, dto.password);
    setAuthCookies(res, result);
    return result;
  }

  @Throttle(THROTTLE_LOGIN)
  @Post('conductor/login')
  @HttpCode(HttpStatus.OK)
  async loginConductorHandler(
    @Body() dto: LoginConductorDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.loginConductor.execute(dto.usuario, dto.password);
    setAuthCookies(res, result);
    return result;
  }

  // Algo más holgado: la app/web renueva tokens de forma legítima.
  // El token se toma del body (móvil) o de la cookie de refresh (web).
  @Throttle(THROTTLE_REFRESH)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshHandler(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const token = dto.refreshToken ?? leerCookie(req, COOKIE_REFRESH);
    if (!token) {
      throw new UnauthorizedException('Refresh token ausente');
    }
    const result = await this.refreshToken.execute(token);
    setAuthCookies(res, result);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logoutHandler(
    @CurrentUser() user: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logout.execute(user.sub, user.type);
    clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  meHandler(@CurrentUser() user: AuthPrincipal): Promise<PrincipalPublico> {
    return this.getMe.execute(user.sub, user.type);
  }
}
