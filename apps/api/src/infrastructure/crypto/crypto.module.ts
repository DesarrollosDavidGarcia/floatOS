import { Global, Module } from '@nestjs/common';
import { SecretCryptoService } from './secret-crypto.service';

/** Cifrado de secretos en reposo, disponible globalmente. */
@Global()
@Module({
  providers: [SecretCryptoService],
  exports: [SecretCryptoService],
})
export class CryptoModule {}
