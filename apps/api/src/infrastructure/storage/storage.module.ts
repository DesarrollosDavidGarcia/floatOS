import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Acceso global al almacenamiento de objetos (MinIO). */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
