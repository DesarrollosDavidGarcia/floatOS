// Seed idempotente de los catálogos por defecto. Vuelve a correrlo cuando
// agregues grupos nuevos; usa upsert por (grupo, codigo) y no pisa cambios
// manuales del admin (solo inserta lo que falte / actualiza nombre y color).
//
//   node prisma/seed-catalogos.mjs   (con Node 20)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** grupo -> [ [codigo, nombre, color?] ] (orden = índice) */
const CATALOGOS = {
  TIPO_DOCUMENTO_CONDUCTOR: [
    ['LICENCIA_FEDERAL', 'Licencia federal'],
    ['EXAMEN_MEDICO', 'Examen médico'],
    ['INE', 'INE'],
    ['CURP', 'CURP'],
    ['RFC', 'RFC'],
    ['COMPROBANTE_DOMICILIO', 'Comprobante de domicilio'],
    ['CONSTANCIA_SITUACION_FISCAL', 'Constancia de situación fiscal'],
    ['CONTRATO', 'Contrato'],
    ['ALTA_IMSS', 'Alta IMSS'],
    ['OTRO', 'Otro'],
  ],
  TIPO_DOCUMENTO_UNIDAD: [
    ['VERIFICACION', 'Verificación'],
    ['SEGURO', 'Seguro'],
    ['TARJETA_CIRCULACION', 'Tarjeta de circulación'],
    ['OTRO', 'Otro'],
  ],
  CATEGORIA_LICENCIA: [
    ['A', 'Categoría A'],
    ['B', 'Categoría B'],
    ['C', 'Categoría C'],
    ['D', 'Categoría D'],
    ['E', 'Categoría E'],
    ['F', 'Categoría F'],
  ],
  TIPO_EXAMEN_MEDICO: [
    ['APTITUD_PSICOFISICA', 'Aptitud psicofísica'],
    ['ANTIDOPING', 'Antidoping'],
    ['EXAMEN_GENERAL', 'Examen general'],
    ['VISTA', 'Vista'],
    ['AUDITIVO', 'Auditivo'],
    ['OTRO', 'Otro'],
  ],
  RESULTADO_EXAMEN: [
    ['APTO', 'Apto', 'success'],
    ['NO_APTO', 'No apto', 'destructive'],
    ['CONDICIONADO', 'Condicionado', 'secondary'],
    ['PENDIENTE', 'Pendiente', 'secondary'],
  ],
  TIPO_CERTIFICACION: [
    ['MATERIALES_PELIGROSOS', 'Materiales peligrosos'],
    ['RESIDUOS_PELIGROSOS', 'Residuos peligrosos'],
    ['MANEJO_DEFENSIVO', 'Manejo defensivo'],
    ['PRIMEROS_AUXILIOS', 'Primeros auxilios'],
    ['CAAT', 'CAAT'],
    ['MERCANCIAS_PELIGROSAS_SCT', 'Mercancías peligrosas (SCT)'],
    ['OTRO', 'Otro'],
  ],
  TIPO_INCIDENCIA: [
    ['ACCIDENTE', 'Accidente'],
    ['INFRACCION', 'Infracción'],
    ['SANCION', 'Sanción'],
    ['FALTA', 'Falta'],
    ['QUEJA', 'Queja'],
    ['RECONOCIMIENTO', 'Reconocimiento'],
    ['OTRO', 'Otro'],
  ],
  GRAVEDAD_INCIDENCIA: [
    ['BAJA', 'Baja', 'outline'],
    ['MEDIA', 'Media', 'secondary'],
    ['ALTA', 'Alta', 'destructive'],
    ['CRITICA', 'Crítica', 'destructive'],
  ],
  TIPO_EVENTO_LABORAL: [
    ['INGRESO', 'Ingreso'],
    ['ASCENSO', 'Ascenso'],
    ['CAMBIO_PUESTO', 'Cambio de puesto'],
    ['CAMBIO_SALARIO', 'Cambio de salario'],
    ['AMONESTACION', 'Amonestación'],
    ['RECONOCIMIENTO', 'Reconocimiento'],
    ['BAJA', 'Baja'],
    ['OTRO', 'Otro'],
  ],
  TIPO_UNIDAD_MANEJO: [
    ['TRACTOCAMION', 'Tractocamión'],
    ['TORTON', 'Tortón'],
    ['RABON', 'Rabón'],
    ['THORTON', 'Thorton'],
    ['CAMION_3_5', 'Camión 3.5'],
    ['CAMIONETA', 'Camioneta'],
    ['CAJA_SECA', 'Caja seca'],
    ['CAJA_REFRIGERADA', 'Caja refrigerada'],
    ['PLATAFORMA', 'Plataforma'],
    ['TOLVA', 'Tolva'],
    ['PIPA', 'Pipa'],
    ['FULL', 'Full'],
    ['OTRO', 'Otro'],
  ],
  NIVEL_APTITUD: [
    ['PRINCIPIANTE', 'Principiante', 'outline'],
    ['INTERMEDIO', 'Intermedio', 'secondary'],
    ['EXPERTO', 'Experto', 'success'],
  ],
  TIPO_CONTROL_CONFIANZA: [
    ['EXAMEN_CONFIANZA', 'Examen de confianza'],
    ['ANTECEDENTES_NO_PENALES', 'Antecedentes no penales'],
    ['ESTUDIO_SOCIOECONOMICO', 'Estudio socioeconómico'],
    ['POLIGRAFO', 'Polígrafo'],
    ['TOXICOLOGICO', 'Toxicológico'],
    ['OTRO', 'Otro'],
  ],
  TIPO_AUSENCIA: [
    ['INCAPACIDAD_IMSS', 'Incapacidad IMSS'],
    ['VACACIONES', 'Vacaciones'],
    ['PERMISO_CON_GOCE', 'Permiso con goce'],
    ['PERMISO_SIN_GOCE', 'Permiso sin goce'],
    ['FALTA_JUSTIFICADA', 'Falta justificada'],
    ['FALTA_INJUSTIFICADA', 'Falta injustificada'],
    ['OTRO', 'Otro'],
  ],
  TIPO_GASTO: [
    ['COMBUSTIBLE', 'Combustible'],
    ['CASETA', 'Caseta'],
    ['VIATICOS', 'Viáticos'],
    ['OTRO', 'Otro'],
  ],
  TIPO_UNIDAD: [
    ['TRACTOCAMION', 'Tractocamión'],
    ['TORTON', 'Tortón'],
    ['RABON', 'Rabón'],
    ['CAMION', 'Camión'],
    ['CAMIONETA', 'Camioneta'],
    ['PLATAFORMA', 'Plataforma'],
    ['PIPA', 'Pipa'],
    ['OTRO', 'Otro'],
  ],
  ASEGURADORA: [
    ['QUALITAS', 'Quálitas'],
    ['GNP', 'GNP'],
    ['AXA', 'AXA'],
    ['HDI', 'HDI'],
    ['CHUBB', 'Chubb'],
    ['ZURICH', 'Zurich'],
    ['OTRO', 'Otro'],
  ],
  PUESTO: [
    ['OPERADOR', 'Operador'],
    ['OPERADOR_A', 'Operador A'],
    ['OPERADOR_B', 'Operador B'],
    ['AUXILIAR', 'Auxiliar'],
    ['OTRO', 'Otro'],
  ],
  TIPO_SANGRE: [
    ['O_POS', 'O+'],
    ['O_NEG', 'O−'],
    ['A_POS', 'A+'],
    ['A_NEG', 'A−'],
    ['B_POS', 'B+'],
    ['B_NEG', 'B−'],
    ['AB_POS', 'AB+'],
    ['AB_NEG', 'AB−'],
  ],
  // Marca de la unidad (editable por el admin; lista inicial de referencia).
  MARCA_UNIDAD: [
    ['KENWORTH', 'Kenworth'],
    ['FREIGHTLINER', 'Freightliner'],
    ['INTERNATIONAL', 'International'],
    ['VOLVO', 'Volvo'],
    ['SCANIA', 'Scania'],
    ['MERCEDES_BENZ', 'Mercedes-Benz'],
    ['HINO', 'Hino'],
    ['ISUZU', 'Isuzu'],
    ['MACK', 'Mack'],
    ['DINA', 'DINA'],
    ['FORD', 'Ford'],
    ['CHEVROLET', 'Chevrolet'],
    ['NISSAN', 'Nissan'],
    ['OTRO', 'Otra'],
  ],
  // Modelo de la unidad (lista inicial mínima; el admin agrega los suyos).
  MODELO_UNIDAD: [
    ['T680', 'T680'],
    ['T880', 'T880'],
    ['CASCADIA', 'Cascadia'],
    ['PROSTAR', 'ProStar'],
    ['LT', 'LT'],
    ['FH', 'FH'],
    ['R_SERIES', 'R Series'],
    ['ACTROS', 'Actros'],
    ['OTRO', 'Otro'],
  ],
  // Tipo de carga (lo usa el motor de cálculo para compatibilidad carga↔unidad).
  TIPO_CARGA: [
    ['GENERAL', 'General'],
    ['PALETIZADA', 'Paletizada'],
    ['REFRIGERADA', 'Refrigerada'],
    ['CONGELADA', 'Congelada'],
    ['GRANEL', 'Granel'],
    ['LIQUIDA', 'Líquida'],
    ['PELIGROSA', 'Peligrosa'],
    ['SOBREDIMENSIONADA', 'Sobredimensionada'],
    ['OTRO', 'Otro'],
  ],
  // Acción de una escala del itinerario.
  ACCION_ESCALA: [
    ['RECOGER', 'Recoger'],
    ['ENTREGAR', 'Entregar'],
    ['RECOGER_ENTREGAR', 'Recoger y entregar'],
    ['PASO', 'Paso / escala'],
  ],
  // Sentido de un movimiento de carga en una escala.
  SENTIDO_CARGA: [
    ['CARGA', 'Carga'],
    ['DESCARGA', 'Descarga'],
  ],
};

async function main() {
  let total = 0;
  for (const [grupo, items] of Object.entries(CATALOGOS)) {
    for (let i = 0; i < items.length; i++) {
      const [codigo, nombre, color] = items[i];
      await prisma.catalogoItem.upsert({
        where: { grupo_codigo: { grupo, codigo } },
        update: { nombre, color: color ?? null, orden: i },
        create: { grupo, codigo, nombre, color: color ?? null, orden: i },
      });
      total++;
    }
  }
  console.log(`✔ Catálogos sembrados/actualizados: ${total} items en ${Object.keys(CATALOGOS).length} grupos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
