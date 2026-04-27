import React, { useState } from 'react';
import { CreditCard, CheckCircle } from 'lucide-react';
import { PAYMENT_METHODS } from '../../utils/constants';
import { validatePaymentForm } from '../../utils/validators';
import { generateReceiptPDF } from '../../services/pdfService';

export default function AgentPaymentsView({ tenants, payments, onPay, showAlert }) {
  const tenantsWithDebt = tenants.filter((t) => t.balance > 0);
  const [form, setForm] = useState({ tenantId: '', amount: '', method: PAYMENT_METHODS[0], ref: '' });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSelectTenant = (e) => {
    const t = tenants.find((x) => x.id === e.target.value);
    setForm((f) => ({ ...f, tenantId: e.target.value, amount: t ? t.balance : '' }));
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
        method: form.method,
        currentBalance: tenant.balance,
        processedBy: 'agent',
      });

      // CUS05 - Generar PDF del recibo
      generateReceiptPDF({
        receiptNumber,
        tenant,
        amount: Number(form.amount),
        method: form.method,
        reference: form.ref || receiptNumber,
        date: new Date().toISOString().slice(0, 10),
      });

      showAlert(`CUS04 Exitoso. CUS05: Recibo ${receiptNumber} generado. Nuevo saldo: $${newBalance}`);
      setForm({ tenantId: '', amount: '', method: PAYMENT_METHODS[0], ref: '' });
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Registro de Pagos (Agente)</h2>

      {/* CUS04 Flujo B */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-emerald-500">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" /> CUS04 Flujo B: Registrar Pago de Arrendatario
        </h3>
        <form onSubmit={handlePay} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Arrendatario Moroso *</label>
            <select value={form.tenantId} onChange={handleSelectTenant}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
              <option value="">Seleccione Inquilino con deuda</option>
              {tenantsWithDebt.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — Deuda: ${t.balance}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto ($) *</label>
            <input type="number" value={form.amount} onChange={set('amount')}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Método de Pago</label>
            <select value={form.method} onChange={set('method')}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="lg:col-span-4 flex justify-end">
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">Recibo (CUS05)</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Inquilino</th>
              <th className="p-4">Monto</th>
              <th className="p-4">Método</th>
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
                  <td className="p-4 font-medium text-emerald-600 text-sm">${p.amount}</td>
                  <td className="p-4 text-slate-500 text-sm">{p.method}</td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">Sin pagos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
