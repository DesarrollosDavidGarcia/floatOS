import { plainToInstance, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

/**
 * Esquema de validación de variables de entorno, ejecutado por
 * `ConfigModule.forRoot({ validate })` durante el arranque. El objetivo es
 * fallar rápido con un mensaje claro si falta o es inválida una variable
 * REQUERIDA, en lugar de explotar más tarde con un error opaco.
 *
 * Criterio conservador para no fragilizar el arranque:
 *  - REQUERIDAS: solo lo que el sistema necesita sí o sí (base de datos y JWT).
 *    Coincide con el fail-fast que ya hacía `AuthService`.
 *  - OPCIONALES (`@IsOptional`): todo lo demás (MinIO, SMTP/Brevo, routing,
 *    datos de empresa, CORS, PORT...). Tienen valores por defecto en el código
 *    o degradan con elegancia. Aquí solo se valida su FORMATO si están
 *    presentes, sin obligar a que existan.
 */
export class EnvironmentVariables {
  // --- Entorno ---
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  // --- Base de datos (REQUERIDA) ---
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  // --- Redis (opcional: tiene default redis://localhost en la conexión) ---
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REDIS_URL?: string;

  // --- Auth / JWT (REQUERIDAS) ---
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  JWT_ACCESS_TTL!: number;

  @Type(() => Number)
  @IsInt()
  JWT_REFRESH_TTL!: number;

  // Llave para cifrar secretos en reposo. Opcional: si falta se deriva de
  // JWT_SECRET con un aviso (ver SecretCryptoService).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SECRETS_KEY?: string;

  // --- CORS (opcional: sin ella, dev refleja el origen) ---
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  // --- MinIO / Storage (opcional: tiene defaults en StorageService) ---
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT?: string;

  @IsOptional()
  @IsNumberString()
  MINIO_PORT?: string;

  @IsOptional()
  @IsBooleanString()
  MINIO_USE_SSL?: string;

  @IsOptional()
  @IsString()
  MINIO_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  MINIO_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET?: string;

  // --- SMTP (opcional) ---
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumberString()
  SMTP_PORT?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SMTP_FROM?: string;

  // --- Correo (opcional) ---
  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  BREVO_API_KEY?: string;

  @IsOptional()
  @IsString()
  BREVO_SENDER_EMAIL?: string;

  @IsOptional()
  @IsString()
  BREVO_SENDER_NAME?: string;

  // --- Ruteo por carretera (opcional: degrada a distancia geodésica) ---
  @IsOptional()
  @IsIn(['tomtom', 'google'])
  ROUTING_PROVIDER?: string;

  @IsOptional()
  @IsString()
  TOMTOM_API_KEY?: string;

  @IsOptional()
  @IsNumberString()
  TOMTOM_MAX_DIARIO?: string;

  @IsOptional()
  @IsString()
  GOOGLE_MAPS_SERVER_KEY?: string;

  @IsOptional()
  @IsNumberString()
  GOOGLE_MAPS_MAX_DIARIO?: string;

  // --- Datos del emisor para documentos (opcional) ---
  @IsOptional()
  @IsString()
  EMPRESA_NOMBRE?: string;

  @IsOptional()
  @IsString()
  EMPRESA_RFC?: string;

  @IsOptional()
  @IsString()
  EMPRESA_DIRECCION?: string;

  @IsOptional()
  @IsString()
  EMPRESA_TELEFONO?: string;

  @IsOptional()
  @IsString()
  EMPRESA_EMAIL?: string;

  // --- IA generativa (opcional: si falta, las funciones de IA se deshabilitan) ---
  // Proveedor compatible con OpenAI (por defecto Novita). Sin NOVITA_API_KEY,
  // AiService queda no-disponible y los endpoints de IA responden 503.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  NOVITA_API_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  AI_BASE_URL?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  AI_VISION_MODEL?: string;

  // Páginas de PDF a leer en la extracción (default 4, tope 10).
  @IsOptional()
  @IsNumberString()
  AI_PDF_MAX_PAGINAS?: string;

  // --- Bot / integraciones (n8n) ---
  // API key para clientes de servicio (header X-Api-Key). Sin ella, los
  // endpoints /api/bot/* responden 503.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  BOT_API_KEY?: string;

  // --- Push (FCM / Firebase) — opcional ---
  // Credencial de servicio para enviar push. Sin ella, el push queda
  // deshabilitado (las notificaciones locales siguen funcionando). Usar UNA:
  //  - FIREBASE_SERVICE_ACCOUNT_PATH: ruta al JSON de la cuenta de servicio.
  //  - FIREBASE_SERVICE_ACCOUNT: el JSON completo en una sola línea.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  FIREBASE_SERVICE_ACCOUNT_PATH?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  FIREBASE_SERVICE_ACCOUNT?: string;
}

/**
 * Función de validación para `ConfigModule.forRoot({ validate })`.
 * Lanza un Error con un mensaje legible (lista de variables inválidas) si la
 * configuración no cumple el esquema; en caso correcto devuelve el objeto
 * validado/transformado.
 */
export function validarEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    // No descartamos las variables desconocidas (hay muchas que NestJS no
    // conoce: POSTGRES_*, ADMIN_*, despliegue...). Solo validamos las nuestras.
    enableImplicitConversion: false,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const detalles = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join('; ')
          : 'valor inválido';
        return `  - ${error.property}: ${constraints}`;
      })
      .join('\n');
    throw new Error(
      'Configuración de entorno inválida. Revisa estas variables:\n' +
        detalles,
    );
  }

  return validatedConfig;
}
