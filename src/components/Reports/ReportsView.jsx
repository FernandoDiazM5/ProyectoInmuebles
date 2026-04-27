import React, { useState, useMemo } from 'react';
import { FileDown, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import { useReports } from '../../hooks/useReports';
import { COLLECTION_GOAL_PERCENT, ROLES } from '../../utils/constants';
import { formatCurrency, formatDate, todayISO } from '../../utils/formatters';

export default function ReportsView({ tenants, contracts, currentUserRole }) {
  const { totalDue, totalPaid, totalPending, recoveryRate, meetsGoal, tenantRows } =
    useReports(tenants, contracts);

  const isOwner = currentUserRole === ROLES.OWNER;
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenantRows;
    return tenantRows.filter(({ tenant, contract }) =>
      tenant.name.toLowerCase().includes(q) ||
      tenant.dni?.toLowerCase().includes(q) ||
      contract?.contractNumber?.toLowerCase().includes(q)
    );
  }, [tenantRows, search]);

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    const today = formatDate(todayISO());

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Reporte de Cobranza — Inmuebles Pro', 105, 18, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text(`Generado: ${today}`, 105, 26, { align: 'center' });
    pdf.setTextColor(0);

    pdf.setLineWidth(0.4);
    pdf.line(15, 30, 195, 30);

    // KPIs
    const kpiY = 40;
    const kpiH = 14;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');

    const kpis = [
      ['Total Esperado', formatCurrency(totalDue)],
      ['Total Recaudado', formatCurrency(totalPaid)],
      ['Total Pendiente', formatCurrency(totalPending)],
      [`Tasa Cobranza (obj. ${COLLECTION_GOAL_PERCENT}%)`, `${recoveryRate}% ${meetsGoal ? '✓' : '⚠'}`],
    ];

    kpis.forEach(([label, value], i) => {
      const x = 15 + i * 47;
      pdf.setFillColor(241, 245, 249);
      pdf.rect(x, kpiY, 44, kpiH, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(label, x + 2, kpiY + 5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(value, x + 2, kpiY + 11);
    });

    // Tabla de arrendatarios
    const tableY = kpiY + kpiH + 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(51, 65, 85);
    pdf.setTextColor(255);
    pdf.rect(15, tableY, 180, 8, 'F');
    pdf.text('Arrendatario', 17, tableY + 5.5);
    pdf.text('Contrato', 75, tableY + 5.5);
    pdf.text('Monto/Mes', 115, tableY + 5.5);
    pdf.text('Saldo Pendiente', 145, tableY + 5.5);
    pdf.text('Estado', 175, tableY + 5.5);

    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'normal');
    let rowY = tableY + 8;
    const rowH = 7;

    tenantRows.forEach(({ tenant, contract, statusInfo }, i) => {
      if (i % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(15, rowY, 180, rowH, 'F');
      }
      pdf.setFontSize(8);
      pdf.text(tenant.name.slice(0, 22), 17, rowY + 5);
      pdf.text(contract?.contractNumber ?? 'N/A', 75, rowY + 5);
      pdf.text(formatCurrency(contract?.monthlyAmount ?? 0), 115, rowY + 5);
      pdf.text(formatCurrency(tenant.balance), 145, rowY + 5);
      pdf.text(statusInfo.label, 175, rowY + 5);
      rowY += rowH;

      // Nueva página si es necesario
      if (rowY > 270) {
        pdf.addPage();
        rowY = 20;
      }
    });

    pdf.line(15, rowY + 2, 195, rowY + 2);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text('Inmuebles Pro — Sistema de Gestión de Inmuebles', 105, rowY + 8, { align: 'center' });

    pdf.save(`reporte-cobranza-${todayISO()}.pdf`);
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CUS06: Reportes de Cobranza</h2>
          {isOwner && <p className="text-red-500 text-sm font-medium mt-1">Vista Restringida (Propietario)</p>}
        </div>
        <button
          onClick={handleExportPDF}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition"
        >
          <FileDown className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-slate-500 text-sm">Total Esperado (Mes)</p>
          <h4 className="text-2xl font-bold">{formatCurrency(totalDue)}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
          <p className="text-slate-500 text-sm">Total Recaudado</p>
          <h4 className="text-2xl font-bold">{formatCurrency(totalPaid)}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-slate-500 text-sm">Total Pendiente (Morosidad)</p>
          <h4 className="text-2xl font-bold">{formatCurrency(totalPending)}</h4>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-white">
          <p className="text-slate-400 text-sm">Tasa de Cobranza (Obj. {COLLECTION_GOAL_PERCENT}%)</p>
          <div className="flex items-end gap-2 mt-1">
            <h4 className="text-3xl font-bold">{recoveryRate}%</h4>
            {meetsGoal
              ? <CheckCircle className="text-emerald-400 mb-1 w-5 h-5" />
              : <AlertTriangle className="text-yellow-400 mb-1 w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Tabla por inquilino */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm">Estado de Cuenta por Inquilino</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar nombre, cédula o contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
            />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">Arrendatario</th>
              <th className="p-4">Contrato</th>
              <th className="p-4">Monto Mensual</th>
              <th className="p-4">Saldo Pendiente</th>
              <th className="p-4">Indicador de Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                {search ? 'Sin resultados para la búsqueda' : 'Sin datos de cobranza'}
              </td></tr>
            )}
            {filteredRows.map(({ tenant, contract, statusInfo }) => (
              <tr key={tenant.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-sm">{tenant.name}</td>
                <td className="p-4 text-slate-500 text-xs font-mono">{contract?.contractNumber ?? 'N/A'}</td>
                <td className="p-4 text-sm">{formatCurrency(contract?.monthlyAmount ?? 0)}</td>
                <td className="p-4 font-bold text-sm">{formatCurrency(tenant.balance)}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
