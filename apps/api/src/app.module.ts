import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { SharedModule } from './infrastructure/shared/shared.module';
import { HealthController } from './presentation/http/health.controller';

// Módulos de funcionalidad (Fase 1)
import { AuthModule } from './presentation/http/auth/auth.module';
import { ClientesModule } from './presentation/http/clientes/clientes.module';
import { FlotaModule } from './presentation/http/flota/flota.module';
import { ConductoresModule } from './presentation/http/conductores/conductores.module';
import { ViajesModule } from './presentation/http/viajes/viajes.module';
import { TrackingModule } from './presentation/ws/tracking/tracking.module';
import { AlertasModule } from './presentation/http/alertas/alertas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SharedModule,
    AuthModule,
    ClientesModule,
    FlotaModule,
    ConductoresModule,
    ViajesModule,
    TrackingModule,
    AlertasModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
