import { BadRequestException } from '@nestjs/common';

/**
 * Validación de adjuntos por firma de bytes (magic bytes), como defensa en
 * profundidad frente al `mimetype` declarado por el cliente (que es falsificable).
 *
 * Inspecciona los primeros bytes del buffer en memoria (Multer memoryStorage) y
 * comprueba que la firma real corresponde a un tipo permitido y que coincide con
 * el mimetype declarado. Esta validación NO sustituye a la comprobación de
 * `TIPOS_PERMITIDOS` por mimetype: se usa además de ella.
 */

type Detector = (b: Buffer) => boolean;

/** Comprueba que el buffer empieza por la secuencia de bytes dada. */
function empiezaPor(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
}

/** Detectores de firma por mimetype soportado. */
const FIRMAS: Record<string, Detector> = {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  'image/png': (b) => empiezaPor(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  // JPEG: FF D8 FF
  'image/jpeg': (b) => empiezaPor(b, [0xff, 0xd8, 0xff]),
  // PDF: 25 50 44 46  (%PDF)
  'application/pdf': (b) => empiezaPor(b, [0x25, 0x50, 0x44, 0x46]),
  // GIF: 47 49 46 38  (GIF8)
  'image/gif': (b) => empiezaPor(b, [0x47, 0x49, 0x46, 0x38]),
  // WEBP: RIFF (0-3) .... WEBP (8-11)
  'image/webp': (b) =>
    empiezaPor(b, [0x52, 0x49, 0x46, 0x46]) &&
    b.length >= 12 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50,
};

/**
 * Valida la firma real del archivo contra el mimetype declarado.
 *
 * @param buffer Contenido del archivo en memoria (Multer memoryStorage).
 * @param mimetypeDeclarado Mimetype enviado por el cliente (ya validado contra
 *   la allowlist por el llamador).
 * @throws BadRequestException si no hay buffer en memoria, el tipo declarado no
 *   tiene firma conocida, o la firma real no coincide con el tipo declarado.
 */
export function validarFirmaArchivo(
  buffer: Buffer | undefined,
  mimetypeDeclarado: string,
): void {
  // memoryStorage debería garantizar el buffer; si no llega, fallamos cerrado.
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException(
      'No se pudo leer el contenido del archivo para validarlo.',
    );
  }

  const detector = FIRMAS[mimetypeDeclarado];
  if (!detector) {
    // No hay firma conocida para un tipo que se decía permitido: rechazamos.
    throw new BadRequestException(
      'El contenido del archivo no coincide con su tipo declarado.',
    );
  }

  if (!detector(buffer)) {
    throw new BadRequestException(
      'El contenido del archivo no coincide con su tipo declarado.',
    );
  }
}
