import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un access token JWT válido en el header Authorization: Bearer. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
