import React, { useState } from 'react';
import { Banknote, FileText } from 'lucide-react';
import { validatePaymentForm } from '../../utils/validators';
import {
  getReceiptPdfBlobUrl,
  generateReceiptPDF,
  receiptPdfContextFromPayment,
} from '../../services/pdfService';
import { formatCurrency } from '../../utils/formatters';
import SuccessDialog from '../Layout/SuccessDialog';

const AGENT_PAYMENT_METHOD = 'Efectivo';

export default function AgentPaymentsView({ tenants, payments, onPay, showAlert }) {
  const tenantsWithDebt = tenants.filter((t) => t.balance > 0);
  const [form, setForm] = useState({ tenantId: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [successDetail, setSuccessDetail] = useState(null);

  const handleSelectTenant = (e) => {
    const t = tenants.find((x) => x.id === e.target.value);
    setForm((f) => ({ ...f, tenantId: e.target.value, amount: t ? String(t.balance) : '' }));
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const tenant = tenants.find((t) => t.id === form.tenantId);
    const err = validatePaymentForm({ tenantId: form.tenantId, amount: form.amount, maxAmount: tenant?.balance });
    if (err) { showAlert(err, 'error'); return; }
    setSaving(true);
    try {
      const { receiptNumber, newBalance } = await onPay({
        tenantId: form.tenantId,
        amount: form.amount,
        method: AGENT_PAYMENT_METHOD,
        currentBalance: tenant.balance,
        processedBy: 'agent',
      });

      setSuccessDetail({
        receiptNumber,
        tenantName: tenant?.name ?? 'Arrendatario',
        newBalance,
      });
      setForm({ tenantId: '', amount: '' });
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openReceiptPreview = (p, rowTenant) => {
    if (!rowTenant) {
      showAlert('No hay datos del arrendatario para generar este recibo.', 'error');
      return;
    }
    const ctx = receiptPdfContextFromPayment(p, rowTenant);
    const url = getReceiptPdfBlobUrl(ctx);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      URL.revokeObjectURL(url);
      showAlert('El navegador bloqueó la ventana. Permita ventanas emergentes para ver el PDF.', 'error');
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  };

  const downloadReceipt = (p, rowTenant) => {
    if (!rowTenant) {
      showAlert('No hay datos del arrendatario para generar este recibo.', 'error');
      return;
    }
    generateReceiptPDF(receiptPdfContextFromPayment(p, rowTenant));
  };

  return (
    <div>
      <SuccessDialog
        open={!!successDetail}
        onClose={() => setSuccessDetail(null)}
        title="Pago en efectivo registrado"
        message={
          successDetail
            ? `Recibo ${successDetail.receiptNumber} registrado para ${successDetail.tenantName}. Saldo actualizado: ${formatCurrency(successDetail.newBalance)}. Puede verlo o descargarlo desde la tabla.`
            : ''
        }
      />

      <h2 className="text-2xl font-bold text-slate-800 mb-6">Registro de Pagos (Agente)</h2>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-emerald-500">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-emerald-600" /> Registrar pago en efectivo
        </h3>
        <form onSubmit={handlePay} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Arrendatario Moroso *</label>
            <select value={form.tenantId} onChange={handleSelectTenant}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
              <option value="">Seleccione Inquilino con deuda</option>
              {tenantsWithDebt.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — Deuda: {formatCurrency(t.balance)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto en efectivo (S/.) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              disabled
              readOnly
              title="Se registra el pago por el saldo pendiente completo del arrendatario seleccionado"
              className="w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-600 bg-slate-50 cursor-not-allowed outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <p className="text-xs text-slate-400 mt-1">Definido por el saldo pendiente del inquilino elegido.</p>
          </div>
          <div className="lg:col-span-3 flex justify-end">
            <button type="submit" disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2 rounded-lg font-medium text-sm">
              {saving ? 'Procesando...' : 'Registrar Pago y Generar Recibo'}
            </button>
          </div>
        </form>
      </div>

      {/* Historial */}
      <h3 className="text-xl font-bold text-slate-800 mb-4">Últimos Pagos Registrados</h3>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[52rem]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">Recibo</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Inquilino</th>
              <th className="p-4">Monto</th>
              <th className="p-4">Método</th>
              <th className="p-4 whitespace-nowrap w-[10rem]">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {[...payments].reverse().map((p) => {
              const t = tenants.find((x) => x.id === p.tenantId);
              return (
                <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-4 font-mono text-xs text-blue-600 font-bold">{p.receiptNumber}</td>
                  <td className="p-4 text-sm">{p.date}</td>
                  <td className="p-4 text-sm">{t?.name ?? 'N/A'}</td>
                  <td className="p-4 font-medium text-emerald-600 text-sm">{formatCurrency(p.amount)}</td>
                  <td className="p-4 text-slate-500 text-sm">{p.method}</td>
                  <td className="p-3 align-middle">
                    {t ? (
                      <div className="flex flex-col gap-1.5 min-w-[8.5rem]">
                        <button
                          type="button"
                          onClick={() => openReceiptPreview(p, t)}
                          className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 shadow-sm hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98] transition flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          Ver recibo
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadReceipt(p, t)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
                        >
                          Descargar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin arrendatario</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-sm">Sin pagos registrados</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
