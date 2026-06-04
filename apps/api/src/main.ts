import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de Nginx: confiar en el primer proxy para que el rate limiter
  // (ThrottlerGuard) cuente por la IP real del cliente (X-Forwarded-For),
  // no por la IP del reverse proxy.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Documentación interactiva (Swagger UI) en /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FlotaOS API')
    .setDescription('Backend de FlotaOS — Fase 1. Usa el botón "Authorize" con el accessToken de POST /api/auth/login.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Aplica el esquema bearer globalmente (las rutas públicas igual funcionan sin token).
  document.security = [{ bearer: [] }];
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`FlotaOS API escuchando en http://0.0.0.0:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger UI en http://0.0.0.0:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
