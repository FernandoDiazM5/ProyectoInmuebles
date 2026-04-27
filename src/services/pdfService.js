import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from '../utils/formatters';

// CUS05 - Genera PDF de recibo de pago
export const generateReceiptPDF = ({ receiptNumber, tenant, amount, method, reference, date }) => {
  const pdf = new jsPDF();

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
  pdf.text(receiptNumber, 60, y);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Fecha:', 20, y + lineH);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatDate(date), 60, y + lineH);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Arrendatario:', 20, y + lineH * 2);
  pdf.setFont('helvetica', 'normal');
  pdf.text(tenant.name, 60, y + lineH * 2);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Cédula/DNI:', 20, y + lineH * 3);
  pdf.setFont('helvetica', 'normal');
  pdf.text(tenant.dni, 60, y + lineH * 3);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Monto Pagado:', 20, y + lineH * 4);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatCurrency(amount), 60, y + lineH * 4);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Método:', 20, y + lineH * 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(method, 60, y + lineH * 5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Referencia:', 20, y + lineH * 6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(reference, 60, y + lineH * 6);

  pdf.line(20, y + lineH * 7 + 2, 190, y + lineH * 7 + 2);
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text('Este recibo es un comprobante válido de pago.', 105, y + lineH * 8 + 4, { align: 'center' });

  pdf.save(`${receiptNumber}.pdf`);
};

// CUS02 - Genera PDF de contrato
export const generateContractPDF = ({ contract, tenant, property }) => {
  const pdf = new jsPDF();

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONTRATO DE ARRENDAMIENTO', 105, 20, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.line(20, 25, 190, 25);

  const y = 35;
  const lh = 8;

  const row = (label, value, offsetY) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, 20, y + offsetY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value), 70, y + offsetY);
  };

  row('N° Contrato', contract.contractNumber, 0);
  row('Arrendatario', tenant.name, lh);
  row('Cédula/DNI', tenant.dni, lh * 2);
  row('Email', tenant.email, lh * 3);
  row('Propiedad', property.address, lh * 4);
  row('Tipo', property.type, lh * 5);
  row('Inicio', formatDate(contract.startDate), lh * 6);
  row('Duración', `${contract.duration} meses`, lh * 7);
  row('Monto Mensual', formatCurrency(contract.monthlyAmount), lh * 8);
  row('Estado', contract.status, lh * 9);

  pdf.line(20, y + lh * 11, 190, y + lh * 11);
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text('Generado por Inmuebles Pro — Sistema de Gestión de Inmuebles', 105, y + lh * 12, { align: 'center' });

  pdf.save(`${contract.contractNumber}.pdf`);
};
