import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthPrincipal } from '../decorators/current-user.decorator';

interface JwtPayload {
  sub?: string;
  type?: 'admin' | 'conductor';
}

/**
 * Valida el access token. El payload firmado es { sub, type }.
 * Lo que retorna validate() queda en request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('La variable de entorno JWT_SECRET no está configurada');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthPrincipal {
    if (!payload?.sub || (payload.type !== 'admin' && payload.type !== 'conductor')) {
      throw new UnauthorizedException('Token inválido');
    }
    return { sub: payload.sub, type: payload.type };
  }
}
