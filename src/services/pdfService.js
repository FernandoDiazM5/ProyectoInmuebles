import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DEFAULT_PROPERTY_TYPE } from '../utils/constants';

// CUS05 — Contenido del PDF de recibo de pago
function renderReceiptPdf(pdf, { receiptNumber, tenant, amount, method, reference, date }) {
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Inmuebles Pro', 105, 20, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('RECIBO DE PAGO', 105, 30, { align: 'center' });

  pdf.setLineWidth(0.5);
  pdf.line(20, 35, 190, 35);

  pdf.setFontSize(11);
  const y = 45;
  const lineH = 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text('N° Recibo:', 20, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(receiptNumber ?? ''), 60, y);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Fecha:', 20, y + lineH);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatDate(date), 60, y + lineH);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Arrendatario:', 20, y + lineH * 2);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(tenant?.name ?? '—'), 60, y + lineH * 2);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Cédula/DNI:', 20, y + lineH * 3);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(tenant?.dni ?? '—'), 60, y + lineH * 3);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Monto Pagado:', 20, y + lineH * 4);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatCurrency(amount), 60, y + lineH * 4);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Método:', 20, y + lineH * 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(method ?? '—'), 60, y + lineH * 5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Referencia:', 20, y + lineH * 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(reference ?? '—'), 60, y + lineH * 6);

  pdf.line(20, y + lineH * 7 + 2, 190, y + lineH * 7 + 2);
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text('Este recibo es un comprobante válido de pago.', 105, y + lineH * 8 + 4, { align: 'center' });
  pdf.setTextColor(0);
}

/** Instancia jsPDF lista para `.save()` o `.output('blob')`. */
export const buildReceiptPdf = ({ receiptNumber, tenant, amount, method, reference, date }) => {
  const pdf = new jsPDF();
  renderReceiptPdf(pdf, { receiptNumber, tenant, amount, method, reference, date });
  return pdf;
};

/** Descarga el PDF del recibo (fallback robusto para navegadores con bloqueos). */
export const generateReceiptPDF = (ctx) => {
  const url = getReceiptPdfBlobUrl(ctx);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ctx.receiptNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/** Vista previa en nueva pestaña; revocar la URL tras unos segundos. */
export const getReceiptPdfBlobUrl = (ctx) => {
  const blob = buildReceiptPdf(ctx).output('blob');
  return URL.createObjectURL(blob);
};

/** Fecha YYYY-MM-DD para el PDF a partir del documento de pago en Firestore. */
export function paymentDateISOForReceipt(payment) {
  const d = payment?.date;
  if (typeof d === 'string') {
    const t = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  }
  try {
    if (d && typeof d.toDate === 'function') return d.toDate().toISOString().slice(0, 10);
    if (d && typeof d.seconds === 'number') {
      return new Date(d.seconds * 1000).toISOString().slice(0, 10);
    }
  } catch {
    /* ignore */
  }
  return new Date().toISOString().slice(0, 10);
}

/** Arma el objeto que esperan `buildReceiptPdf` / `getReceiptPdfBlobUrl` desde un pago listado. */
export function receiptPdfContextFromPayment(payment, tenant) {
  return {
    receiptNumber: payment.receiptNumber,
    tenant,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference ?? payment.receiptNumber,
    date: paymentDateISOForReceipt(payment),
  };
}

// CUS02 — arma el contenido del PDF de contrato
function renderContractPdf(pdf, { contract, tenant, property }) {
  const monthlyRaw = contract.monthlyAmount ?? contract.amount;
  const monthlyLabel =
    monthlyRaw != null && monthlyRaw !== '' && !Number.isNaN(Number(monthlyRaw))
      ? formatCurrency(monthlyRaw)
      : '—';

  const door = property?.propertyNumber ?? property?.doorNumber ?? '—';
  const floorLabel =
    property?.floor != null && property?.floor !== ''
      ? String(property.floor)
      : '—';

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONTRATO DE ARRENDAMIENTO', 105, 20, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.line(20, 25, 190, 25);

  const labelX = 20;
  const valueX = 66;
  const valueMaxWidth = 190 - valueX - 14;
  const lh = 7;
  let cursorY = 35;
  const rowGap = 2;

  const rowField = (label, value) => {
    const str = String(value ?? '—');
    const valueLines = pdf.splitTextToSize(str, valueMaxWidth);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, labelX, cursorY);
    pdf.setFont('helvetica', 'normal');
    valueLines.forEach((ln, i) => {
      pdf.text(ln, valueX, cursorY + i * lh);
    });
    cursorY += valueLines.length * lh + rowGap;
  };

  rowField('N° Contrato', contract.contractNumber);
  rowField('Arrendatario', tenant?.name);
  rowField('Cédula/DNI', tenant?.dni);
  rowField('Email', tenant?.email);
  rowField('Ubicación', property?.address);
  rowField('Tipo de departamento', DEFAULT_PROPERTY_TYPE);
  rowField('Nº puerta', door);
  rowField('Planta', floorLabel);
  rowField('Inicio', formatDate(contract.startDate));
  rowField('Duración', `${contract.duration ?? '—'} meses`);
  rowField('Alquiler mensual', monthlyLabel);
  rowField('Estado del contrato', contract.status ?? '—');

  pdf.setTextColor(0);
  const lineY = cursorY + 4;
  pdf.line(20, lineY, 190, lineY);
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text('Generado por Inmuebles Pro — Sistema de Gestión de Inmuebles', 105, lineY + 10, {
    align: 'center',
  });
}

/** Devuelve instancia lista para `.save()`, `.output('blob')`, etc. */
export const buildContractPdf = ({ contract, tenant, property }) => {
  const pdf = new jsPDF();
  renderContractPdf(pdf, { contract, tenant, property });
  return pdf;
};

/** Descarga el archivo PDF (nombre = N° contrato). */
export const generateContractPDF = ({ contract, tenant, property }) => {
  buildContractPdf({ contract, tenant, property }).save(`${contract.contractNumber}.pdf`);
};

/** Blob URL temporal para abrir en una pestaña; conviene hacer `URL.revokeObjectURL` después. */
export const getContractPdfBlobUrl = ({ contract, tenant, property }) => {
  const pdf = buildContractPdf({ contract, tenant, property });
  const blob = pdf.output('blob');
  return URL.createObjectURL(blob);
};
