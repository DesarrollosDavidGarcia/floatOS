import { Logger, Module } from '@nestjs/common';
import { RouteService } from './route.service';
import { GeocodingService } from './geocoding.service';
import { TomTomRouteProvider } from './tomtom.provider';
import { GoogleRouteProvider } from './google.provider';
import { GeodesicaRouteProvider } from './geodesica.provider';
import { CARRETERA_PROVIDER, type CarreteraProvider } from './route-provider';

/**
 * Módulo de ruteo (distancia/tiempo de itinerarios). PrismaModule es @Global, no
 * se importa aquí. Exporta RouteService para que el motor de viajes lo inyecte.
 *
 * El proveedor de carretera activo se elige por env `ROUTING_PROVIDER`
 * (`google` | `tomtom`; default `tomtom` para no cambiar de comportamiento
 * hasta tener Google configurado). El cambio es reversible sin redeploy.
 */
@Module({
  providers: [
    RouteService,
    GeocodingService,
    TomTomRouteProvider,
    GoogleRouteProvider,
    GeodesicaRouteProvider,
    {
      provide: CARRETERA_PROVIDER,
      inject: [TomTomRouteProvider, GoogleRouteProvider],
      useFactory: (
        tomtom: TomTomRouteProvider,
        google: GoogleRouteProvider,
      ): CarreteraProvider => {
        const elegido = (process.env.ROUTING_PROVIDER ?? 'tomtom').toLowerCase();
        const provider = elegido === 'google' ? google : tomtom;
        new Logger('RoutingModule').log(
          `Proveedor de ruteo por carretera: ${provider.proveedor}`,
        );
        return provider;
      },
    },
  ],
  exports: [RouteService, GeocodingService],
})
export class RoutingModule {}
