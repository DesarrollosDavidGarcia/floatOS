import { Global, Module } from '@nestjs/common';
import { PasswordService } from './password.service';

/** Servicios transversales disponibles globalmente (sin reimportar). */
@Global()
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class SharedModule {}
