import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, CreditCard, CheckCircle, FileText, Loader } from 'lucide-react';
import { generateReceiptPDF, getReceiptPdfBlobUrl, receiptPdfContextFromPayment } from '../../services/pdfService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { nextMonthlyDueDateISO } from '../../utils/rentDueDate';
import { getExternalGatewayTheme } from '../../services/externalPaymentGateway';
import ExternalGatewaySimulationModal from './ExternalGatewaySimulationModal';
import {
  SIMULATION_REDIRECT_MS,
  SIMULATION_PROCESS_MS,
  SIMULATION_SUCCESS_MS,
  CONTRACT_STATUS,
} from '../../utils/constants';

const MERCHANT_DISPLAY_NAME = 'Inmuebles Pro';

function contractCreatedMillis(c) {
  const v = c?.createdAt;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  const s = typeof v?.seconds === 'number' ? v.seconds : typeof v?._seconds === 'number' ? v._seconds : NaN;
  return Number.isFinite(s) ? s * 1000 : 0;
}

export default function TenantPortalView({ tenant, contracts = [], payments, onPay, showAlert, loading }) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Mercado Pago');
  const [yapeCode, setYapeCode] = useState('');
  const [saving, setSaving] = useState(false);

  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gatewayStep, setGatewayStep] = useState('redirecting');

  useEffect(() => {
    if (tenant) setAmount(tenant.balance);
  }, [tenant]);

  const gatewayTheme = useMemo(() => getExternalGatewayTheme(method), [method]);

  const activeContract = useMemo(() => {
    if (!tenant) return null;
    const actives = contracts.filter(
      (c) => c.tenantId === tenant.id && c.status === CONTRACT_STATUS.ACTIVE
    );
    if (actives.length === 0) return null;
    actives.sort((a, b) => contractCreatedMillis(b) - contractCreatedMillis(a));
    return actives[0];
  }, [contracts, tenant]);

  const paymentDueISO = useMemo(() => {
    if (!activeContract?.startDate) return null;
    return nextMonthlyDueDateISO(activeContract.startDate);
  }, [activeContract]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Perfil de arrendatario no encontrado</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          Tu cuenta de usuario está activa, pero el agente inmobiliario aún no ha registrado
          tu perfil de arrendatario en el sistema. Contacta a tu agente para que complete el registro.
        </p>
      </div>
    );
  }

  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id).reverse();

  const finalizePaymentAfterGateway = async (paidAmount = null) => {
    const amtNum =
      paidAmount != null && Number.isFinite(Number(paidAmount)) ? Number(paidAmount) : Number(amount);

    setSaving(true);
    try {
      const { receiptNumber, newBalance } = await onPay({
        tenantId: tenant.id,
        amount: amtNum,
        method,
        yapeCode,
        currentBalance: tenant.balance,
        processedBy: 'self',
      });

      generateReceiptPDF({
        receiptNumber,
        tenant,
        amount: amtNum,
        method,
        reference: method === 'Yape' ? `YAPE-${yapeCode}` : receiptNumber,
        date: new Date().toISOString().slice(0, 10),
      });

      showAlert(`Pago procesado correctamente. Recibo ${receiptNumber}. Saldo: ${formatCurrency(newBalance)}`);
      setAmount(0);
      setYapeCode('');
      setGatewayOpen(false);
    } catch (ex) {
      showAlert(ex.message, 'error');
      setGatewayOpen(false);
    } finally {
      setSaving(false);
    }
  };

  /** Tras confirmar en el paso intermedio → procesamiento simulado → registro interno del pago */
  const runGatewayAuthorize = (charged) => {
    const n = Number(charged);
    if (!Number.isFinite(n) || n <= 0 || n > tenant.balance) {
      showAlert('Monto inválido: debe ser mayor a 0 y no superar el saldo pendiente', 'error');
      return;
    }
    setAmount(n);
    setGatewayStep('processing');
    setTimeout(() => {
      setGatewayStep('success');
      setTimeout(() => finalizePaymentAfterGateway(n), SIMULATION_SUCCESS_MS);
    }, SIMULATION_PROCESS_MS);
  };

  const handleInitiatePayment = (e) => {
    e.preventDefault();
    if (Number(amount) <= 0 || Number(amount) > tenant.balance) {
      showAlert('Monto inválido: debe ser mayor a 0 y no superar el saldo pendiente', 'error');
      return;
    }
    if (method === 'Yape' && !yapeCode.trim()) {
      showAlert('Ingrese el código de aprobación de Yape', 'error');
      return;
    }

    setGatewayOpen(true);
    setGatewayStep('redirecting');
    setTimeout(() => setGatewayStep('checkout'), SIMULATION_REDIRECT_MS);
  };

  const openReceiptPreview = (p) => {
    const ctx = receiptPdfContextFromPayment(p, tenant);
    const url = getReceiptPdfBlobUrl(ctx);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      URL.revokeObjectURL(url);
      showAlert('El navegador bloqueó la ventana. Permita ventanas emergentes para ver el PDF.', 'error');
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  };

  const downloadReceipt = (p) => {
    generateReceiptPDF(receiptPdfContextFromPayment(p, tenant));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Mi Portal de Arrendatario</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-center items-center border-t-4 border-slate-800">
          <p className="text-slate-500 font-medium">Saldo Pendiente Actual</p>
          <h3 className={`text-5xl font-bold mt-2 ${tenant.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(tenant.balance)}
          </h3>
          <span className={`inline-block mt-4 px-4 py-2 rounded-full text-sm font-bold
            ${tenant.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {tenant.balance > 0 ? 'PAGO REQUERIDO' : 'AL DÍA'}
          </span>

          {paymentDueISO ? (
            <div className="mt-8 w-full border-t border-slate-100 pt-6 flex flex-col items-center gap-2 text-center px-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide">Vencimiento del pago</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatDate(paymentDueISO)}</p>
              <p className="text-xs text-slate-600 max-w-md text-center">
                Esta fecha está sujeta al día del mes en que comenzó tu contrato.
              </p>
            </div>
          ) : (
            <p className="mt-8 text-xs text-slate-400 text-center px-4">
              {activeContract
                ? 'No se pudo calcular la fecha de vencimiento a partir del contrato.'
                : 'Tu fecha de vencimiento aparecerá cuando tengas un contrato activo registrado.'}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 border-b pb-2 mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" aria-hidden /> Realizar Pago
          </h3>

          {tenant.balance > 0 ? (
            <form onSubmit={handleInitiatePayment}>
              <div className="mb-4">
                <label className="block text-sm text-slate-600 mb-1">Monto a pagar (S/.)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={tenant.balance}
                  value={amount}
                  disabled
                  title="El pago aplicará el saldo pendiente completo"
                  className="w-full border rounded-lg p-2 font-bold text-lg text-slate-600 bg-slate-50 cursor-not-allowed outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border-slate-200"
                />
                <p className="text-xs text-slate-400 mt-1">Corresponde a tu saldo pendiente actual.</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-slate-600 mb-1">Método de pago</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  className="w-full border rounded-lg p-2 text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="Mercado Pago">Mercado Pago (Tarjeta/Saldo)</option>
                  <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito</option>
                  <option value="Yape">Yape (Código de Aprobación)</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                </select>
              </div>
              {method === 'Yape' && (
                <div className="mb-4 animate-fade-in">
                  <label className="block text-sm text-slate-600 mb-1">Código de aprobación Yape</label>
                  <input type="text" placeholder="Ej: 012345" value={yapeCode}
                    onChange={(e) => setYapeCode(e.target.value)}
                    className="w-full border rounded-lg p-2 text-slate-700 font-mono tracking-wider bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              )}
              <button type="submit" disabled={saving}
                style={{ backgroundColor: gatewayTheme.accent }}
                className="w-full text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2 text-sm hover:brightness-110 disabled:opacity-60">
                {saving ? <><Loader className="w-4 h-4 animate-spin" /> Procesando…</> : (
                  <>
                    <CreditCard className="w-4 h-4" aria-hidden />
                    Continuar con el pago
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-8 text-slate-500 flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-3" />
              <p className="text-lg">No tienes deudas pendientes.<br />¡Gracias por estar al día!</p>
            </div>
          )}
        </div>
      </div>

      <ExternalGatewaySimulationModal
        open={gatewayOpen}
        step={gatewayStep}
        method={method}
        theme={gatewayTheme}
        amount={Number(amount)}
        maxAmount={tenant.balance}
        merchantName={MERCHANT_DISPLAY_NAME}
        yapeCode={yapeCode}
        onClose={() => !(['processing', 'success'].includes(gatewayStep)) && !saving && setGatewayOpen(false)}
        onConfirmCheckout={runGatewayAuthorize}
      />

      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-slate-600" /> Historial de Pagos
      </h3>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">N° Recibo</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Monto</th>
              <th className="p-4">Método</th>
              <th className="p-4">Estado</th>
              <th className="p-4 whitespace-nowrap w-[10rem]">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {tenantPayments.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-sm">Aún no hay pagos registrados.</td></tr>
            ) : tenantPayments.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-mono text-xs font-bold text-blue-600">{p.receiptNumber}</td>
                <td className="p-4 text-sm">{p.date}</td>
                <td className="p-4 font-bold text-emerald-600 text-sm">{formatCurrency(p.amount)}</td>
                <td className="p-4 text-slate-500 text-sm">{p.method}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 w-max">
                    <CheckCircle className="w-3 h-3" aria-hidden /> Procesado
                  </span>
                </td>
                <td className="p-3 align-middle">
                  <div className="flex flex-col gap-1.5 min-w-[8.5rem]">
                    <button
                      type="button"
                      onClick={() => openReceiptPreview(p)}
                      className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 shadow-sm hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98] transition flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      Ver recibo
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadReceipt(p)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
                    >
                      Descargar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
