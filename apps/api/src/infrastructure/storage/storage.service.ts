import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

/**
 * Almacenamiento de objetos (MinIO/S3). Sube, descarga (URL temporal firmada) y
 * elimina archivos binarios. El bucket se crea bajo demanda en el primer uso.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket = process.env.MINIO_BUCKET ?? 'flotaos';
  private bucketListo = false;

  constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET_KEY ?? '',
    });
  }

  private async asegurarBucket(): Promise<void> {
    if (this.bucketListo) return;
    const existe = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!existe) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket '${this.bucket}' creado.`);
    }
    this.bucketListo = true;
  }

  /** Genera una object key única conservando la extensión del nombre original. */
  generarKey(prefijo: string, nombreOriginal: string): string {
    const punto = nombreOriginal.lastIndexOf('.');
    const ext = punto >= 0 ? nombreOriginal.slice(punto).toLowerCase() : '';
    return `${prefijo}/${randomUUID()}${ext}`;
  }

  async subir(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.asegurarBucket();
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  /** URL temporal de descarga (por defecto 5 min) que fuerza la descarga con el nombre dado. */
  async urlDescarga(
    key: string,
    nombreDescarga: string,
    expiraSegundos = 300,
  ): Promise<string> {
    await this.asegurarBucket();
    return this.client.presignedGetObject(this.bucket, key, expiraSegundos, {
      'response-content-disposition': `attachment; filename="${encodeURIComponent(
        nombreDescarga,
      )}"`,
    });
  }

  /**
   * URL temporal para *mostrar* el objeto en el navegador (sin forzar descarga).
   * Pensada para imágenes embebidas (<img src>): por defecto vive 1 hora para
   * que la miniatura no caduque mientras se navega la tabla.
   */
  async urlVisualizacion(key: string, expiraSegundos = 3600): Promise<string> {
    await this.asegurarBucket();
    return this.client.presignedGetObject(this.bucket, key, expiraSegundos);
  }

  async eliminar(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (err) {
      // No bloquear el borrado del registro si el objeto ya no existe.
      this.logger.warn(`No se pudo eliminar el objeto '${key}': ${String(err)}`);
    }
  }
}
