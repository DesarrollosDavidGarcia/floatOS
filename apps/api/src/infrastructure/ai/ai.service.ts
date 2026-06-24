import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dirname, join, resolve, sep } from 'node:path';
import OpenAI from 'openai';
import { pdfToPng } from 'pdf-to-png-converter';

/**
 * Workaround del bug de Windows en `pdf-to-png-converter`: arma la ruta de
 * `cmaps`/`standard_fonts` con `\` (separador de Windows), pero pdfjs 5 exige
 * que `cMapUrl`/`standardFontDataUrl` terminen en `/` (lanza "must include
 * trailing slash"). Reemplazamos su `normalizePath` por una versión con barras.
 * No-op en POSIX (Linux/Docker/prod), donde el separador ya es `/`.
 *
 * Nota: la librería restringe subpaths con `exports`, así que requerimos el
 * archivo interno por RUTA ABSOLUTA (eso sí evita la restricción) usando el
 * `require.resolve` del paquete raíz.
 */
let parcheCmapsAplicado = false;
function parcharRutasPdfEnWindows(): void {
  if (parcheCmapsAplicado || sep === '/') {
    parcheCmapsAplicado = true;
    return;
  }
  try {
    const outDir = dirname(require.resolve('pdf-to-png-converter'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require(join(outDir, 'normalizePath.js'));
    mod.normalizePath = (p: string): string => {
      const abs = resolve(p).replace(/\\/g, '/');
      return abs.endsWith('/') ? abs : `${abs}/`;
    };
  } catch {
    // Si cambia la estructura interna de la librería, dejamos el comportamiento
    // original (el PDF fallará en Windows, pero no rompe nada más).
  }
  parcheCmapsAplicado = true;
}

/**
 * Resultado de extraer datos de un documento del expediente (licencia, póliza,
 * tarjeta de circulación, verificación, etc.) a partir de una foto.
 *
 * Las fechas se normalizan a `YYYY-MM-DD`. `null` cuando el dato no aparece o el
 * modelo no está seguro: NUNCA se inventan datos.
 */
export interface ExtraccionDocumento {
  /** Número/folio del documento si es legible (p. ej. número de licencia/póliza). */
  numero: string | null;
  /** Fecha de emisión/expedición en `YYYY-MM-DD`, o `null`. */
  fechaEmision: string | null;
  /** Fecha de vencimiento/vigencia en `YYYY-MM-DD`, o `null`. */
  fechaVencimiento: string | null;
  /** Confianza global de la extracción. */
  confianza: 'alta' | 'media' | 'baja';
  /** Avisos para que el humano revise (ilegible, dato ambiguo, etc.). */
  advertencias: string[];
}

/**
 * Resultado de extraer datos de una Constancia de Situación Fiscal (SAT) para
 * prellenar el alta de un cliente.
 */
export interface ExtraccionCliente {
  /** Denominación/razón social, o nombre completo (persona física). */
  razonSocial: string | null;
  /** RFC en mayúsculas, sin espacios. */
  rfc: string | null;
  /** Código SAT del régimen fiscal mapeado desde su nombre, o `null` si no se reconoció. */
  regimenFiscal: string | null;
  /** Nombre del régimen tal como aparece en la constancia. */
  regimenFiscalNombre: string | null;
  /** Código postal del domicilio fiscal. */
  cpFiscal: string | null;
  /** Domicilio fiscal completo (calle, número, colonia, municipio, estado, CP). */
  direccion: string | null;
  confianza: 'alta' | 'media' | 'baja';
  advertencias: string[];
}

export interface EntradaExtraccion {
  /** Contenido del archivo en memoria (Multer memoryStorage). Imagen o PDF. */
  buffer: Buffer;
  /** Mimetype (image/jpeg | image/png | image/webp | application/pdf). */
  mimetype: string;
  /** Etiqueta del tipo de documento (del catálogo) como pista para el modelo. */
  tipoEtiqueta?: string;
}

const BASE_URL_DEFECTO = 'https://api.novita.ai/openai';
// Modelo de visión multimodal confirmado en Novita (OCR + structured output).
// Cámbialo con AI_VISION_MODEL (p. ej. otro Qwen3-VL).
const MODELO_DEFECTO = 'qwen/qwen3-vl-30b-a3b-instruct';
/** Páginas de PDF a leer por defecto (configurable con AI_PDF_MAX_PAGINAS). */
const PDF_MAX_PAGINAS_DEFECTO = 4;
/** Tope duro de páginas para evitar costo/latencia desbocados. */
const PDF_MAX_PAGINAS_TOPE = 10;

/** Meses en español (minúscula, sin acentos relevantes) → número 1-12. */
const MESES_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/**
 * Mapa de regímenes fiscales (palabra clave normalizada → código SAT c_RegimenFiscal).
 * Se evalúa en orden: el primero que coincida gana. Lo que no encaje queda en
 * null para que el usuario lo elija manualmente.
 */
const REGIMENES_SAT: ReadonlyArray<readonly [RegExp, string]> = [
  [/simplificado de confianza/, '626'],
  [/fines no lucrativos/, '603'],
  [/sueldos y salarios|asimilados a salarios/, '605'],
  [/arrendamiento/, '606'],
  [/enajenacion de bienes/, '607'],
  [/adquisicion de bienes/, '609'],
  [/demas ingresos/, '608'],
  [/intereses/, '614'],
  [/dividendos/, '611'],
  [/plataformas tecnologicas/, '625'],
  [/incorporacion fiscal/, '621'],
  [/coordinados/, '624'],
  [/actividades agricolas|ganaderas|silvicolas|pesqueras|agapes/, '622'],
  [/sin obligaciones fiscales/, '616'],
  [/actividades empresariales y profesionales/, '612'],
  // Genéricos al final para no ganarle a los específicos de arriba.
  [/general de ley|personas morales/, '601'],
];

const SYSTEM_PROMPT_DOC = [
  'Eres un asistente que extrae datos de documentos oficiales de una flota de',
  'transporte en México (licencia federal de conductor, póliza de seguro,',
  'tarjeta de circulación, verificación vehicular, INE, constancia fiscal, etc.).',
  'El documento puede venir como una imagen o como VARIAS imágenes (las',
  'páginas de un PDF): analízalas TODAS en conjunto como un único documento.',
  'Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, sin',
  'markdown, con exactamente estas claves:',
  '{"numero": string|null, "fechaEmision": string|null,',
  ' "fechaVencimiento": string|null, "certeza": "alta"|"media"|"baja",',
  ' "advertencias": string[]}.',
  'Reglas estrictas:',
  '- Las fechas SIEMPRE en formato YYYY-MM-DD.',
  '- Si un dato no aparece, es ilegible o no estás seguro, usa null. NO inventes.',
  '- "fechaVencimiento" es la fecha hasta la que el documento es válido',
  '  (vigencia / "válido hasta" / vence el). Si el documento NO tiene fecha de',
  '  vencimiento (p. ej. una Constancia de Situación Fiscal), usa null. NO uses',
  '  la fecha de emisión, de inicio de operaciones ni de pagos como vencimiento.',
  '- "numero" es el folio o número identificador del documento si es legible',
  '  (p. ej. número de póliza/licencia; para constancia fiscal puede ser el RFC).',
  '- "certeza" es TU confianza en la extracción: usa SOLO "alta", "media" o',
  '  "baja". NO copies texto del documento en este campo.',
  '- "advertencias": máximo 3, breves, en español (datos dudosos o ilegibles).',
  'IMPORTANTE: responde con UN ÚNICO objeto JSON. No repitas las claves ni',
  'vuelvas a escribir el objeto; cierra el objeto y termina.',
].join(' ');

const SYSTEM_PROMPT_CLIENTE = [
  'Eres un asistente que extrae datos de una Constancia de Situación Fiscal',
  '(CSF) del SAT (México) para dar de alta un cliente. El documento puede venir',
  'como una o varias imágenes (páginas de un PDF): analízalas todas.',
  'Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, sin',
  'markdown, con exactamente estas claves:',
  '{"razonSocial": string|null, "rfc": string|null, "regimenFiscal": string|null,',
  ' "cpFiscal": string|null, "direccion": string|null,',
  ' "certeza": "alta"|"media"|"baja", "advertencias": string[]}.',
  'Reglas estrictas:',
  '- "razonSocial": la Denominación/Razón Social (persona moral) o el nombre',
  '  completo (persona física: nombre + apellidos).',
  '- "rfc": el RFC en mayúsculas, sin espacios.',
  '- "regimenFiscal": el NOMBRE del régimen tal como aparece (p. ej. "Régimen',
  '  Simplificado de Confianza"). NO el código.',
  '- "cpFiscal": el código postal del domicilio fiscal (5 dígitos).',
  '- "direccion": el domicilio fiscal completo en una línea (calle, número',
  '  exterior/interior, colonia, municipio/alcaldía, estado, CP).',
  '- Si un dato no aparece o es ilegible, usa null. NO inventes.',
  '- "certeza" es TU confianza en la extracción: SOLO "alta", "media" o "baja".',
  '- "advertencias": máximo 3, breves, en español.',
  'IMPORTANTE: responde con UN ÚNICO objeto JSON. No repitas las claves ni',
  'vuelvas a escribir el objeto; cierra el objeto y termina.',
].join(' ');

/**
 * Cliente de IA generativa sobre un proveedor compatible con OpenAI
 * (por defecto Novita). Agnóstico del proveedor: base URL, modelo y API key se
 * configuran por entorno, así que cambiar de modelo/proveedor es solo config.
 *
 * Tolerante a configuración ausente: si no hay API key, `disponible` es false y
 * los métodos lanzan un 503 claro en vez de tumbar el arranque.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly modelo: string;
  private readonly pdfMaxPaginas: number;

  constructor() {
    const apiKey = process.env.NOVITA_API_KEY ?? process.env.AI_API_KEY;
    const baseURL = process.env.AI_BASE_URL ?? BASE_URL_DEFECTO;
    this.modelo = process.env.AI_VISION_MODEL ?? MODELO_DEFECTO;

    const max = Number(process.env.AI_PDF_MAX_PAGINAS);
    this.pdfMaxPaginas =
      Number.isInteger(max) && max >= 1
        ? Math.min(max, PDF_MAX_PAGINAS_TOPE)
        : PDF_MAX_PAGINAS_DEFECTO;

    if (!apiKey) {
      this.client = null;
      this.logger.warn(
        'NOVITA_API_KEY no configurada: las funciones de IA quedan deshabilitadas.',
      );
    } else {
      this.client = new OpenAI({ apiKey, baseURL });
      this.logger.log(`IA lista (modelo: ${this.modelo}, base: ${baseURL}).`);
    }
  }

  /** True si hay credenciales configuradas y la IA puede usarse. */
  get disponible(): boolean {
    return this.client !== null;
  }

  /**
   * Extrae número y fechas de un documento del expediente a partir de su foto/PDF.
   * Pensado para prellenar el formulario; el humano siempre revisa y confirma.
   */
  async extraerDatosDocumento(
    entrada: EntradaExtraccion,
  ): Promise<ExtraccionDocumento> {
    const pista = entrada.tipoEtiqueta
      ? `El usuario indica que el documento es de tipo: "${entrada.tipoEtiqueta}". `
      : '';
    const obj = await this.obtenerObjeto(
      entrada,
      SYSTEM_PROMPT_DOC,
      pista +
        'Extrae los datos de este documento (puede tener varias páginas) y responde solo con el JSON.',
    );
    return this.mapearDocumento(obj);
  }

  /**
   * Extrae los datos de una Constancia de Situación Fiscal (SAT) para prellenar
   * el alta de un cliente. El humano siempre revisa antes de guardar.
   */
  async extraerDatosClienteCsf(
    entrada: EntradaExtraccion,
  ): Promise<ExtraccionCliente> {
    const obj = await this.obtenerObjeto(
      entrada,
      SYSTEM_PROMPT_CLIENTE,
      'Extrae los datos de esta Constancia de Situación Fiscal y responde solo con el JSON.',
    );
    return this.mapearCliente(obj);
  }

  // ─────────────────────── Pipeline común ───────────────────────

  /**
   * Llama al modelo (visión) con el system prompt dado y devuelve el primer
   * objeto JSON interpretable. Reintenta una vez si el JSON sale roto/truncado.
   */
  private async obtenerObjeto(
    entrada: EntradaExtraccion,
    systemPrompt: string,
    userText: string,
  ): Promise<Record<string, unknown>> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'La extracción con IA no está configurada en este entorno.',
      );
    }

    const imagenes = await this.construirImagenes(entrada);

    let obj: Record<string, unknown> | null = null;
    let ultimoCrudo = '';
    for (let intento = 1; intento <= 2 && !obj; intento++) {
      let crudo: string;
      try {
        const respuesta = await this.client.chat.completions.create({
          model: this.modelo,
          temperature: 0,
          // Acotado: el objeto cabe de sobra y limita los bucles de repetición
          // que algunos modelos abiertos producen en modo JSON.
          max_tokens: 600,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userText },
                ...imagenes.map(
                  (url) => ({ type: 'image_url', image_url: { url } }) as const,
                ),
              ],
            },
          ],
        });
        crudo = respuesta.choices[0]?.message?.content?.trim() ?? '';
      } catch (error) {
        this.logger.error(
          `Fallo al llamar al proveedor de IA: ${(error as Error).message}`,
        );
        throw new ServiceUnavailableException(
          'El servicio de IA no está disponible en este momento.',
        );
      }
      ultimoCrudo = crudo;
      obj = this.parsearObjeto(crudo);
    }

    if (!obj) {
      this.logger.warn(
        `Respuesta de IA no parseable como JSON: ${JSON.stringify(ultimoCrudo.slice(0, 400))}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo interpretar la respuesta de la IA. Intenta de nuevo o captura los datos a mano.',
      );
    }
    return obj;
  }

  /** Construye los data URLs de imagen (una si es imagen; varias si es PDF). */
  private async construirImagenes(
    entrada: EntradaExtraccion,
  ): Promise<string[]> {
    if (entrada.mimetype === 'application/pdf') {
      return this.pdfADataUrls(entrada.buffer);
    }
    return [
      `data:${entrada.mimetype};base64,${entrada.buffer.toString('base64')}`,
    ];
  }

  /** Rasteriza las primeras páginas de un PDF a PNG (data URLs). */
  private async pdfADataUrls(buffer: Buffer): Promise<string[]> {
    parcharRutasPdfEnWindows();
    const paginas = Array.from(
      { length: this.pdfMaxPaginas },
      (_, i) => i + 1,
    );

    let renderizadas;
    try {
      // pagesToProcess ignora páginas fuera de rango: si el PDF tiene menos de
      // pdfMaxPaginas, simplemente devuelve las que existen.
      renderizadas = await pdfToPng(buffer, {
        viewportScale: 2,
        pagesToProcess: paginas,
        returnPageContent: true,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo rasterizar el PDF: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'No se pudo leer el PDF (¿protegido o dañado?). Intenta con una foto del documento.',
      );
    }

    const urls = renderizadas
      .filter((p) => p.content && p.content.length > 0)
      .map((p) => `data:image/png;base64,${(p.content as Buffer).toString('base64')}`);

    if (urls.length === 0) {
      throw new BadRequestException(
        'El PDF no contiene páginas legibles para extraer.',
      );
    }
    return urls;
  }

  // ─────────────────────── Parseo robusto ───────────────────────

  /**
   * Interpreta la respuesta del modelo como objeto JSON. Tolera fences de
   * markdown, comas finales y, como último recurso, rescata los campos por regex
   * cuando el modelo entra en bucle (repite el objeto) y deja un JSON inválido.
   */
  private parsearObjeto(crudo: string): Record<string, unknown> | null {
    const json = this.extraerJson(crudo);
    if (json) {
      try {
        return JSON.parse(json) as Record<string, unknown>;
      } catch {
        try {
          return JSON.parse(this.limpiarJson(json)) as Record<string, unknown>;
        } catch {
          /* cae al salvavidas */
        }
      }
    }
    return this.salvarObjetoPorRegex(crudo);
  }

  /** Aísla el primer objeto JSON dentro de un texto (quita fences de markdown). */
  private extraerJson(texto: string): string | null {
    const sinFences = texto
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const inicio = sinFences.indexOf('{');
    const fin = sinFences.lastIndexOf('}');
    if (inicio === -1 || fin === -1 || fin < inicio) return null;
    return sinFences.slice(inicio, fin + 1);
  }

  /** Quita comas finales antes de `}`/`]` (JSON inválido que emiten algunos modelos). */
  private limpiarJson(json: string): string {
    return json.replace(/,(\s*[}\]])/g, '$1');
  }

  /**
   * Salvavidas cuando el JSON no parsea (bucle de repetición / truncado): extrae
   * la PRIMERA aparición de cada par "clave": valor por regex y reconstruye un
   * objeto plano. El primer bloque del bucle suele tener los datos correctos.
   */
  private salvarObjetoPorRegex(crudo: string): Record<string, unknown> | null {
    const obj: Record<string, unknown> = {};
    const re =
      /"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:\s*("(?:[^"\\]|\\.)*"|null|true|false|-?\d+(?:\.\d+)?|\[[^\]]*\])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(crudo)) !== null) {
      const clave = m[1];
      if (clave in obj) continue; // solo la primera aparición
      try {
        obj[clave] = JSON.parse(m[2]);
      } catch {
        /* valor no parseable: lo omitimos */
      }
    }
    return Object.keys(obj).length > 0 ? obj : null;
  }

  // ─────────────────────── Mapeo por dominio ───────────────────────

  private mapearDocumento(obj: Record<string, unknown>): ExtraccionDocumento {
    return {
      numero: this.aTextoOpcional(obj.numero),
      fechaEmision: this.normalizarFecha(obj.fechaEmision),
      fechaVencimiento: this.normalizarFecha(obj.fechaVencimiento),
      confianza: this.aCerteza(obj.certeza ?? obj.confianza),
      advertencias: this.aAdvertencias(obj.advertencias),
    };
  }

  private mapearCliente(obj: Record<string, unknown>): ExtraccionCliente {
    const regimenNombre = this.aTextoOpcional(
      obj.regimenFiscal ?? obj.regimenFiscalNombre,
    );
    const regimenCodigo = this.mapearRegimen(regimenNombre);
    const advertencias = this.aAdvertencias(obj.advertencias);
    if (regimenNombre && !regimenCodigo) {
      advertencias.push(
        `Régimen detectado "${regimenNombre}": selecciónalo manualmente.`,
      );
    }
    return {
      razonSocial: this.aTextoOpcional(obj.razonSocial),
      rfc: this.normalizarRfc(obj.rfc),
      regimenFiscal: regimenCodigo,
      regimenFiscalNombre: regimenNombre,
      cpFiscal: this.normalizarCp(obj.cpFiscal),
      direccion: this.aTextoOpcional(obj.direccion),
      confianza: this.aCerteza(obj.certeza ?? obj.confianza),
      advertencias: advertencias.slice(0, 5),
    };
  }

  // ─────────────────────── Normalizadores ───────────────────────

  private aTextoOpcional(valor: unknown): string | null {
    if (typeof valor !== 'string') return null;
    const t = valor.trim();
    return t.length > 0 ? t : null;
  }

  private aCerteza(valor: unknown): 'alta' | 'media' | 'baja' {
    const v = typeof valor === 'string' ? valor.toLowerCase() : '';
    return v === 'alta' || v === 'media' || v === 'baja' ? v : 'baja';
  }

  private aAdvertencias(valor: unknown): string[] {
    return Array.isArray(valor)
      ? valor
          .filter((a): a is string => typeof a === 'string')
          .map((a) => a.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
  }

  /** RFC en mayúsculas, sin espacios; null si queda vacío. */
  private normalizarRfc(valor: unknown): string | null {
    const t = this.aTextoOpcional(valor);
    if (!t) return null;
    const limpio = t.toUpperCase().replace(/\s+/g, '');
    return limpio.length > 0 ? limpio : null;
  }

  /** Código postal: solo dígitos, 4-5 caracteres; null si no encaja. */
  private normalizarCp(valor: unknown): string | null {
    const t = this.aTextoOpcional(valor);
    if (!t) return null;
    const m = t.match(/\b(\d{4,5})\b/);
    return m ? m[1] : null;
  }

  /** Mapea el nombre del régimen fiscal a su código SAT (o null si no se reconoce). */
  private mapearRegimen(nombre: string | null): string | null {
    if (!nombre) return null;
    const n = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    for (const [re, codigo] of REGIMENES_SAT) {
      if (re.test(n)) return codigo;
    }
    return null;
  }

  /**
   * Normaliza una fecha a `YYYY-MM-DD`. Acepta `YYYY-MM-DD`, `DD/MM/YYYY`,
   * `DD-MM-YYYY` y la forma larga en español ("08 DE JUNIO DE 2026"). Devuelve
   * null si no encaja o no es una fecha de calendario válida.
   */
  private normalizarFecha(valor: unknown): string | null {
    if (typeof valor !== 'string') return null;
    const t = valor.trim();
    if (!t) return null;

    let anio: number;
    let mes: number;
    let dia: number;

    const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const dmy = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    // Forma larga en español: "08 DE JUNIO DE 2026" / "8 de junio de 2026".
    const largo = t
      .toLowerCase()
      .match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/);
    if (iso) {
      anio = Number(iso[1]);
      mes = Number(iso[2]);
      dia = Number(iso[3]);
    } else if (dmy) {
      dia = Number(dmy[1]);
      mes = Number(dmy[2]);
      anio = Number(dmy[3]);
    } else if (largo) {
      dia = Number(largo[1]);
      mes = MESES_ES[largo[2]] ?? 0;
      anio = Number(largo[3]);
      if (mes === 0) return null;
    } else {
      return null;
    }

    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    // Verifica que sea una fecha real (descarta 31/02, etc.) sin desfase de TZ.
    const d = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      d.getUTCFullYear() !== anio ||
      d.getUTCMonth() !== mes - 1 ||
      d.getUTCDate() !== dia
    ) {
      return null;
    }
    const mm = String(mes).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return `${anio}-${mm}-${dd}`;
  }
}
