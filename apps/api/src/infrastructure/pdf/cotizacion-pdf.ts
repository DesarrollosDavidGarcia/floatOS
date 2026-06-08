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
    numEscalas: number;
  };
  cotizacion: {
    folio: number;
    fecha: Date;
    moneda: string;
    lineas: Array<{ concepto: string; monto: number; detalle?: string }>;
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

    // ── Cliente + viaje ──
    let y = 135;
    doc.fontSize(9).fillColor(GRIS).text('CLIENTE', COL_IZQ, y);
    doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text(d.cliente.razonSocial, COL_IZQ, y + 12);
    if (d.cliente.rfc) {
      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text(`RFC: ${d.cliente.rfc}`, COL_IZQ, y + 28);
    }

    doc.fontSize(9).fillColor(GRIS).font('Helvetica').text('VIAJE', 320, y);
    doc.fontSize(10).fillColor('#000000').text(`#${d.viaje.folio}  ${d.viaje.origen} → ${d.viaje.destino}`, 320, y + 12, { width: COL_DER - 320 });
    const meta = [
      d.viaje.distanciaKm != null ? `${d.viaje.distanciaKm} km` : null,
      d.viaje.pesoKg != null ? `${d.viaje.pesoKg} kg` : null,
      `${d.viaje.numEscalas} escala(s)`,
    ].filter(Boolean).join(' · ');
    doc.fontSize(9).fillColor(GRIS).text(meta, 320, undefined, { width: COL_DER - 320 });

    // ── Tabla de conceptos ──
    y = 200;
    doc.fontSize(9).fillColor(GRIS).font('Helvetica-Bold');
    doc.text('CONCEPTO', COL_IZQ, y);
    doc.text('IMPORTE', 350, y, { width: COL_DER - 350, align: 'right' });
    linea(doc, y + 14);
    y += 22;

    doc.font('Helvetica').fillColor('#000000');
    for (const l of d.cotizacion.lineas) {
      doc.fontSize(10).fillColor('#000000').text(l.concepto, COL_IZQ, y, { width: 290 });
      doc.text(mxn.format(l.monto), 350, y, { width: COL_DER - 350, align: 'right' });
      let alto = 14;
      if (l.detalle) {
        doc.fontSize(8).fillColor(GRIS).text(l.detalle, COL_IZQ, y + 12, { width: 290 });
        alto = 26;
      }
      y += alto;
    }

    // ── Totales (bloque derecho) ──
    linea(doc, y + 2);
    y += 10;
    const c = d.cotizacion;
    y = total(doc, y, 'Subtotal conceptos', mxn.format(c.subtotalConceptos));
    y = total(doc, y, 'Margen', mxn.format(c.margen));
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
