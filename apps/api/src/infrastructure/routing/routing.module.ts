import { Module } from '@nestjs/common';
import { RouteService } from './route.service';
import { TomTomRouteProvider } from './tomtom.provider';
import { GeodesicaRouteProvider } from './geodesica.provider';

/**
 * Módulo de ruteo (distancia/tiempo de itinerarios). PrismaModule es @Global, no
 * se importa aquí. Exporta RouteService para que el motor de viajes lo inyecte.
 */
@Module({
  providers: [RouteService, TomTomRouteProvider, GeodesicaRouteProvider],
  exports: [RouteService],
})
export class RoutingModule {}
