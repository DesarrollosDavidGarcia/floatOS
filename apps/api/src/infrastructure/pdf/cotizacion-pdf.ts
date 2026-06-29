import PDFDocument from 'pdfkit';

/** Datos para renderizar el PDF de una cotización. */
export interface DatosCotizacionPdf {
  emisor: {
    nombre: string;
    rfc?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  cliente: { razonSocial: string; rfc?: string | null };
  viaje: {
    folio: number;
    origen: string;
    destino: string;
    distanciaKm?: number | null;
    pesoKg?: number | null;
    tipoServicio?: string | null;
    numPasajeros?: number | null;
    numEscalas: number;
  };
  cotizacion: {
    folio: number;
    fecha: Date;
    moneda: string;
    lineas: Array<{
      concepto: string;
      monto: number;
      detalle?: string;
      pasaCosto?: boolean;
    }>;
    subtotalConceptos: number;
    margen: number;
    subtotal: number;
    iva: number;
    retencion: number;
    total: number;
    notas?: string | null;
  };
}

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});
const fmtFecha = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const COL_IZQ = 50;
const COL_DER = 545; // borde derecho (A4 595 - margen 50)
const GRIS = '#666666';

/** Genera el PDF de una cotización y lo devuelve como Buffer. */
export function generarCotizacionPdf(d: DatosCotizacionPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Encabezado: emisor (izq) + título (der) ──
    doc.fontSize(18).font('Helvetica-Bold').text(d.emisor.nombre, COL_IZQ, 50);
    doc.fontSize(9).font('Helvetica').fillColor(GRIS);
    const emisorLineas = [
      d.emisor.rfc ? `RFC: ${d.emisor.rfc}` : null,
      d.emisor.direccion,
      [d.emisor.telefono, d.emisor.email].filter(Boolean).join(' · ') || null,
    ].filter(Boolean) as string[];
    emisorLineas.forEach((l) => doc.text(l, COL_IZQ));

    doc
      .fillColor('#000000')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('COTIZACIÓN', 350, 50, { width: COL_DER - 350, align: 'right' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(GRIS)
      .text(`Folio: ${d.cotizacion.folio}`, 350, undefined, {
        width: COL_DER - 350,
        align: 'right',
      })
      .text(`Fecha: ${fmtFecha.format(d.cotizacion.fecha)}`, 350, undefined, {
        width: COL_DER - 350,
        align: 'right',
      });

    doc.fillColor('#000000');
    linea(doc, 120);

    // ── Cliente (izq) + viaje (der) ──
    const bloqueY = 135;
    const VIAJE_X = 320;
    const colW = COL_DER - VIAJE_X;

    doc.fontSize(9).fillColor(GRIS).font('Helvetica').text('CLIENTE', COL_IZQ, bloqueY);
    doc
      .fontSize(11)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text(d.cliente.razonSocial, COL_IZQ, bloqueY + 12, { width: VIAJE_X - COL_IZQ - 20 });
    if (d.cliente.rfc) {
      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text(`RFC: ${d.cliente.rfc}`, COL_IZQ);
    }
    const clienteBottom = doc.y;

    doc.fontSize(9).fillColor(GRIS).font('Helvetica').text('VIAJE', VIAJE_X, bloqueY);
    doc
      .fontSize(9)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text(`#${d.viaje.folio}`, VIAJE_X, bloqueY + 12);
    // Direcciones en fuente menor (8 pt) para que no abarquen tanto.
    const direccion = (etiqueta: string, valor: string): void => {
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(GRIS)
        .text(etiqueta, VIAJE_X, undefined, { width: colW, continued: true })
        .font('Helvetica')
        .fillColor('#000000')
        .text(valor);
    };
    direccion('Origen  ', d.viaje.origen);
    direccion('Destino  ', d.viaje.destino);
    const esPersonal = d.viaje.tipoServicio === 'PERSONAL';
    const meta = [
      d.viaje.distanciaKm != null ? `${d.viaje.distanciaKm} km` : null,
      esPersonal
        ? d.viaje.numPasajeros != null
          ? `${d.viaje.numPasajeros} pasajero(s)`
          : null
        : d.viaje.pesoKg != null
          ? `${d.viaje.pesoKg} kg`
          : null,
      `${d.viaje.numEscalas} escala(s)`,
    ]
      .filter(Boolean)
      .join(' · ');
    doc.fontSize(8).fillColor(GRIS).font('Helvetica').text(meta, VIAJE_X, undefined, { width: colW });
    const viajeBottom = doc.y;

    // ── Tabla de conceptos ──
    let y = Math.max(clienteBottom, viajeBottom) + 18;

    const PAD = 8;
    const IMP_W = 110;
    const CONC_X = COL_IZQ + PAD;
    const CONC_W = COL_DER - COL_IZQ - IMP_W - PAD * 3;
    const IMP_X = COL_DER - IMP_W - PAD;
    const HEAD_H = 18;

    // Encabezado con banda.
    doc.rect(COL_IZQ, y, COL_DER - COL_IZQ, HEAD_H).fill('#eef0f2');
    doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(9);
    doc.text('CONCEPTO', CONC_X, y + 5);
    doc.text('IMPORTE', IMP_X, y + 5, { width: IMP_W, align: 'right' });
    y += HEAD_H;

    // Filas con alto dinámico y zebra.
    d.cotizacion.lineas.forEach((l, i) => {
      // En pass-through, el detalle antepone "a costo".
      const detalle = l.pasaCosto
        ? ['a costo', l.detalle].filter(Boolean).join(' · ')
        : l.detalle;
      doc.font('Helvetica').fontSize(10);
      const hConcepto = doc.heightOfString(l.concepto, { width: CONC_W });
      let hDetalle = 0;
      if (detalle) {
        doc.fontSize(8);
        hDetalle = doc.heightOfString(detalle, { width: CONC_W });
      }
      const rowH = Math.max(20, hConcepto + hDetalle + 8);

      if (i % 2 === 1) {
        doc.rect(COL_IZQ, y, COL_DER - COL_IZQ, rowH).fill('#fafafa');
      }
      doc
        .fillColor('#000000')
        .font('Helvetica')
        .fontSize(10)
        .text(l.concepto, CONC_X, y + 5, { width: CONC_W });
      if (detalle) {
        doc
          .fillColor(l.pasaCosto ? '#b45309' : GRIS)
          .font('Helvetica')
          .fontSize(8)
          .text(detalle, CONC_X, y + 5 + hConcepto, { width: CONC_W });
      }
      doc
        .fillColor('#000000')
        .font('Helvetica')
        .fontSize(10)
        .text(mxn.format(l.monto), IMP_X, y + 5, { width: IMP_W, align: 'right' });
      y += rowH;
    });

    // ── Totales (bloque derecho) ──
    linea(doc, y + 2);
    y += 12;
    const c = d.cotizacion;
    y = total(doc, y, 'Subtotal conceptos', mxn.format(c.subtotalConceptos));
    y = total(doc, y, 'Margen (s/ servicio)', mxn.format(c.margen));
    y = total(doc, y, 'Subtotal', mxn.format(c.subtotal));
    if (c.iva > 0) y = total(doc, y, 'IVA 16%', mxn.format(c.iva));
    if (c.retencion > 0) y = total(doc, y, 'Retención 4%', `- ${mxn.format(c.retencion)}`);
    doc.font('Helvetica-Bold').fontSize(13);
    y = total(doc, y + 4, 'TOTAL', mxn.format(c.total), true);

    // ── Notas + disclaimer ──
    if (c.notas) {
      y += 20;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Notas', COL_IZQ, y);
      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text(c.notas, COL_IZQ, y + 12, { width: COL_DER - COL_IZQ });
    }
    doc
      .fontSize(8)
      .fillColor(GRIS)
      .text(
        'Cotización informativa, no es un comprobante fiscal (CFDI). Precios en ' +
          `${c.moneda}. Sujeta a confirmación y vigencia.`,
        COL_IZQ,
        770,
        { width: COL_DER - COL_IZQ, align: 'center' },
      );

    doc.end();
  });
}

function linea(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(COL_IZQ, y).lineTo(COL_DER, y).strokeColor('#dddddd').stroke();
}

function total(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  valor: string,
  fuerte = false,
): number {
  doc.fillColor(fuerte ? '#000000' : GRIS);
  doc.text(label, 320, y, { width: 120, align: 'right' });
  doc.fillColor('#000000').text(valor, 445, y, { width: COL_DER - 445, align: 'right' });
  return y + (fuerte ? 20 : 16);
}
