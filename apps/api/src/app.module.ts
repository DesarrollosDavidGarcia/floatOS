import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { SharedModule } from './infrastructure/shared/shared.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { HealthController } from './presentation/http/health.controller';

// Módulos de funcionalidad (Fase 1)
import { AuthModule } from './presentation/http/auth/auth.module';
import { ClientesModule } from './presentation/http/clientes/clientes.module';
import { FlotaModule } from './presentation/http/flota/flota.module';
import { ConductoresModule } from './presentation/http/conductores/conductores.module';
import { ExpedienteModule } from './presentation/http/conductores/expediente/expediente.module';
import { CatalogosModule } from './presentation/http/catalogos/catalogos.module';
import { ViajesModule } from './presentation/http/viajes/viajes.module';
import { CotizacionesModule } from './presentation/http/cotizaciones/cotizaciones.module';
import { EmpresaModule } from './presentation/http/empresa/empresa.module';
import { TrackingModule } from './presentation/ws/tracking/tracking.module';
import { AlertasModule } from './presentation/http/alertas/alertas.module';
import { UsuariosModule } from './presentation/http/usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting. Baseline laxo global (defensa en profundidad); los
    // endpoints sensibles (login, link público) lo aprietan con @Throttle y
    // la ingesta de GPS lo omite con @SkipThrottle.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    SharedModule,
    StorageModule,
    CryptoModule,
    AuthModule,
    ClientesModule,
    FlotaModule,
    ConductoresModule,
    ExpedienteModule,
    CatalogosModule,
    ViajesModule,
    CotizacionesModule,
    EmpresaModule,
    TrackingModule,
    AlertasModule,
    UsuariosModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
