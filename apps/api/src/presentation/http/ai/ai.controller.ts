import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AiService,
  ExtraccionCliente,
  ExtraccionDocumento,
} from '../../../infrastructure/ai/ai.service';
import { validarFirmaArchivo } from '../../../application/shared/validar-archivo';
import { ExtraerDocumentoDto } from './dto/extraer-documento.dto';

interface ArchivoSubido {
  buffer?: Buffer;
  mimetype: string;
  size: number;
}

/** Tipos aceptados para extracción con visión: imágenes y PDF (rasterizado). */
const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const TAMANO_MAX_BYTES = 15 * 1024 * 1024; // 15 MB (un PDF escaneado pesa más)

@Controller('ai')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * Extrae número y fechas de un documento a partir de su foto, para prellenar
   * el formulario del expediente. Solo ADMIN (consume tokens del proveedor).
   */
  @Post('documentos/extraer')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('archivo'))
  async extraerDocumento(
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Body() dto: ExtraerDocumentoDto,
  ): Promise<ExtraccionDocumento> {
    this.validar(archivo);
    return this.ai.extraerDatosDocumento({
      buffer: archivo.buffer as Buffer,
      mimetype: archivo.mimetype,
      tipoEtiqueta: dto.tipo,
    });
  }

  /**
   * Extrae los datos de una Constancia de Situación Fiscal (SAT) para prellenar
   * el alta de un cliente. Solo ADMIN (consume tokens del proveedor).
   */
  @Post('clientes/csf')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('archivo'))
  async extraerCsfCliente(
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ): Promise<ExtraccionCliente> {
    this.validar(archivo);
    return this.ai.extraerDatosClienteCsf({
      buffer: archivo.buffer as Buffer,
      mimetype: archivo.mimetype,
    });
  }

  /** Valida que el archivo subido sea imagen/PDF y dentro del límite. */
  private validar(archivo: ArchivoSubido | undefined): asserts archivo {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo a analizar.');
    }
    if (!TIPOS_PERMITIDOS.has(archivo.mimetype)) {
      throw new BadRequestException(
        'Para extracción con IA, sube una foto (JPG, PNG, WEBP) o un PDF.',
      );
    }
    if (archivo.size > TAMANO_MAX_BYTES) {
      throw new BadRequestException(
        'El archivo supera el tamaño máximo (15 MB).',
      );
    }
    // Defensa en profundidad: la firma real debe coincidir con el mimetype.
    validarFirmaArchivo(archivo.buffer, archivo.mimetype);
  }
}
