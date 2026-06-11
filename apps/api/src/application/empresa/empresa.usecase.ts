import { BadRequestException, Injectable } from '@nestjs/common';
import { Empresa, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { SecretCryptoService } from '../../infrastructure/crypto/secret-crypto.service';

/** Archivo recibido por multipart (subconjunto de Express.Multer.File). */
export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Campos de texto editables (no secretos, no archivos). */
const CAMPOS_TEXTO = [
  'razonSocial',
  'rfc',
  'regimenFiscal',
  'telefono',
  'email',
  'calle',
  'numeroExt',
  'numeroInt',
  'colonia',
  'cp',
  'municipio',
  'estado',
  'pais',
  'permisoSctTipo',
  'permisoSctNumero',
  'aseguradoraRespCivil',
  'polizaRespCivil',
  'pacProveedor',
  'pacAmbiente',
  'pacUsuario',
  'csdNumero',
] as const;

/** Entrada de actualización: campos de texto + secretos (write-only). */
export type ActualizarEmpresaInput = Partial<
  Record<(typeof CAMPOS_TEXTO)[number], string>
> & {
  pacToken?: string;
  pacPassword?: string;
  csdPassword?: string;
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_CSD_BYTES = 256 * 1024; // 256 KB (un .cer/.key es pequeño)
const TIPOS_LOGO = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * Configuración de la empresa transportista (emisor). Es un singleton: una sola
 * fila por instancia. Los secretos (token/clave del PAC, contraseña del CSD)
 * nunca se devuelven; en su lugar se exponen banderas `tiene*`.
 */
@Injectable()
export class EmpresaUseCase {
  /** Id fijo del singleton: garantiza una sola fila (sin carreras de creación). */
  private static readonly ID = 'singleton';

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly crypto: SecretCryptoService,
  ) {}

  /** Devuelve la fila única, creándola vacía la primera vez (idempotente). */
  private fila(): Promise<Empresa> {
    return this.prisma.empresa.upsert({
      where: { id: EmpresaUseCase.ID },
      create: { id: EmpresaUseCase.ID },
      update: {},
    });
  }

  /** Vista pública: omite secretos y archivos; expone banderas de presencia. */
  private publica(e: Empresa) {
    const {
      pacToken,
      pacPassword,
      csdPassword,
      csdCerKey,
      csdKeyKey,
      logoKey,
      ...resto
    } = e;
    return {
      ...resto,
      tieneLogo: !!logoKey,
      tienePacToken: !!pacToken,
      tienePacPassword: !!pacPassword,
      tieneCsdCer: !!csdCerKey,
      tieneCsdKey: !!csdKeyKey,
      tieneCsdPassword: !!csdPassword,
    };
  }

  async obtener() {
    return this.publica(await this.fila());
  }

  async actualizar(input: ActualizarEmpresaInput) {
    const actual = await this.fila();
    const data: Prisma.EmpresaUpdateInput = {};

    for (const campo of CAMPOS_TEXTO) {
      const v = input[campo];
      if (v !== undefined) data[campo] = v.trim() || null;
    }
    // Secretos: solo se escriben si llega un valor no vacío (no se borran al
    // dejar el campo en blanco). Se cifran en reposo (AES-256-GCM).
    if (input.pacToken?.trim()) data.pacToken = this.crypto.cifrar(input.pacToken.trim());
    if (input.pacPassword?.trim()) data.pacPassword = this.crypto.cifrar(input.pacPassword.trim());
    if (input.csdPassword?.trim()) data.csdPassword = this.crypto.cifrar(input.csdPassword.trim());

    const upd = await this.prisma.empresa.update({
      where: { id: actual.id },
      data,
    });
    return this.publica(upd);
  }

  /** Sube/reemplaza el logo (imagen ≤2 MB). */
  async subirLogo(archivo: ArchivoSubido) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo.');
    if (!TIPOS_LOGO.has(archivo.mimetype)) {
      throw new BadRequestException('El logo debe ser PNG, JPG o WEBP.');
    }
    if (archivo.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('El logo supera el tamaño máximo de 2 MB.');
    }
    const actual = await this.fila();
    if (actual.logoKey) await this.storage.eliminar(actual.logoKey);
    const key = this.storage.generarKey('empresa/logo', archivo.originalname);
    await this.storage.subir(key, archivo.buffer, archivo.mimetype);
    const upd = await this.prisma.empresa.update({
      where: { id: actual.id },
      data: { logoKey: key },
    });
    return this.publica(upd);
  }

  /** URL temporal del logo (para mostrarlo en el panel/PDF). */
  async logoUrl(): Promise<{ url: string | null }> {
    const e = await this.fila();
    if (!e.logoKey) return { url: null };
    return { url: await this.storage.urlDescarga(e.logoKey, 'logo') };
  }

  /**
   * Sube/reemplaza el Certificado de Sello Digital (.cer y .key) y guarda su
   * contraseña (write-only). Solo se almacena para el timbrado de Fase 2.
   */
  async subirCsd(
    cer: ArchivoSubido | undefined,
    key: ArchivoSubido | undefined,
    password?: string,
  ) {
    if (!cer && !key && !password?.trim()) {
      throw new BadRequestException('No se recibió ningún dato del CSD.');
    }
    const validar = (a: ArchivoSubido | undefined, ext: string) => {
      if (!a) return;
      if (!a.originalname.toLowerCase().endsWith(ext)) {
        throw new BadRequestException(`Se esperaba un archivo ${ext} válido.`);
      }
      if (a.size > MAX_CSD_BYTES) {
        throw new BadRequestException(
          `"${a.originalname}" es demasiado grande para un CSD (máx 256 KB).`,
        );
      }
    };
    validar(cer, '.cer');
    validar(key, '.key');
    const actual = await this.fila();
    const data: Prisma.EmpresaUpdateInput = {};

    if (cer) {
      if (actual.csdCerKey) await this.storage.eliminar(actual.csdCerKey);
      const k = this.storage.generarKey('empresa/csd', cer.originalname);
      await this.storage.subir(k, cer.buffer, cer.mimetype || 'application/octet-stream');
      data.csdCerKey = k;
    }
    if (key) {
      if (actual.csdKeyKey) await this.storage.eliminar(actual.csdKeyKey);
      const k = this.storage.generarKey('empresa/csd', key.originalname);
      await this.storage.subir(k, key.buffer, key.mimetype || 'application/octet-stream');
      data.csdKeyKey = k;
    }
    if (password?.trim()) data.csdPassword = this.crypto.cifrar(password.trim());

    const upd = await this.prisma.empresa.update({
      where: { id: actual.id },
      data,
    });
    return this.publica(upd);
  }

  /**
   * Credenciales descifradas para el timbrado (uso interno de la Parte B; nunca
   * se exponen por la API pública). Devuelve null donde no haya valor.
   */
  async obtenerCredenciales(): Promise<{
    pacProveedor: string | null;
    pacAmbiente: string | null;
    pacUsuario: string | null;
    pacToken: string | null;
    pacPassword: string | null;
    csdPassword: string | null;
  }> {
    const e = await this.fila();
    const d = (v: string | null) => (v ? this.crypto.descifrar(v) : null);
    return {
      pacProveedor: e.pacProveedor,
      pacAmbiente: e.pacAmbiente,
      pacUsuario: e.pacUsuario,
      pacToken: d(e.pacToken),
      pacPassword: d(e.pacPassword),
      csdPassword: d(e.csdPassword),
    };
  }
}
