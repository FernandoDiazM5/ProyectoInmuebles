import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, FileText, Loader, XCircle, Lock } from 'lucide-react';
import { generateReceiptPDF } from '../../services/pdfService';

export default function TenantPortalView({ tenant, payments, onPay, showAlert }) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Mercado Pago');
  const [yapeCode, setYapeCode] = useState('');
  const [saving, setSaving] = useState(false);

  // Simulación pasarela Mercado Pago
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState('redirecting');

  useEffect(() => {
    if (tenant) setAmount(tenant.balance);
  }, [tenant]);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id).reverse();

  const finalizePayment = async () => {
    setSaving(true);
    try {
      const { receiptNumber, newBalance } = await onPay({
        tenantId: tenant.id,
        amount,
        method,
        yapeCode,
        currentBalance: tenant.balance,
        processedBy: 'self',
      });

      generateReceiptPDF({
        receiptNumber,
        tenant,
        amount: Number(amount),
        method,
        reference: method === 'Yape' ? `YAPE-${yapeCode}` : receiptNumber,
        date: new Date().toISOString().slice(0, 10),
      });

      showAlert(`Pago procesado. Recibo ${receiptNumber} generado (CUS05). Saldo: $${newBalance}`);
      setAmount(0);
      setYapeCode('');
      setIsSimulating(false);
    } catch (ex) {
      showAlert(ex.message, 'error');
      setIsSimulating(false);
    } finally {
      setSaving(false);
    }
  };

  const handleInitiatePayment = (e) => {
    e.preventDefault();
    if (Number(amount) <= 0 || Number(amount) > tenant.balance) {
      showAlert('Monto inválido', 'error'); return;
    }
    if (method === 'Yape' && !yapeCode) {
      showAlert('Ingrese el código de aprobación de Yape', 'error'); return;
    }
    if (method === 'Transferencia Bancaria' || method === 'Yape') {
      finalizePayment(); return;
    }
    // Mercado Pago / Tarjeta — simulación pasarela
    setIsSimulating(true);
    setSimulationStep('redirecting');
    setTimeout(() => setSimulationStep('checkout'), 1500);
  };

  const handleProcessPayment = () => {
    setSimulationStep('processing');
    setTimeout(() => {
      setSimulationStep('success');
      setTimeout(finalizePayment, 1500);
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Mi Portal de Arrendatario</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Saldo */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-center items-center border-t-4 border-slate-800">
          <p className="text-slate-500 font-medium">Saldo Pendiente Actual</p>
          <h3 className={`text-5xl font-bold mt-2 ${tenant.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ${tenant.balance}
          </h3>
          <span className={`inline-block mt-4 px-4 py-2 rounded-full text-sm font-bold
            ${tenant.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {tenant.balance > 0 ? 'PAGO REQUERIDO' : 'AL DÍA'}
          </span>
        </div>

        {/* Formulario pago */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> Realizar Pago (CUS04 Flujo A)
          </h3>

          {tenant.balance > 0 ? (
            <form onSubmit={handleInitiatePayment}>
              <div className="mb-4">
                <label className="block text-sm text-slate-600 mb-1">Monto a pagar ($)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full border rounded-lg p-2 font-bold text-lg text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-slate-600 mb-1">Método de Pago</label>
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
                  <label className="block text-sm text-slate-600 mb-1">Código de Aprobación (Yape)</label>
                  <input type="text" placeholder="Ej: 012345" value={yapeCode}
                    onChange={(e) => setYapeCode(e.target.value)}
                    className="w-full border rounded-lg p-2 text-slate-700 font-mono tracking-wider bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              )}
              <button type="submit" disabled={saving}
                className={`w-full text-white font-bold py-3 rounded-lg transition shadow-md flex justify-center items-center gap-2 text-sm
                  ${method === 'Mercado Pago' ? 'bg-[#009ee3] hover:bg-[#008cc9]' :
                    method === 'Yape' ? 'bg-[#7400b8] hover:bg-[#5e0096]' :
                      'bg-blue-600 hover:bg-blue-700'}`}>
                {saving ? <><Loader className="w-4 h-4 animate-spin" /> Procesando...</> : (
                  <>
                    {method === 'Mercado Pago' && <Lock className="w-4 h-4" />}
                    {method === 'Mercado Pago' ? 'Pagar con Mercado Pago' :
                      method === 'Yape' ? 'Validar y Pagar con Yape' :
                        'Procesar Pago Seguro'}
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

      {/* Modal Simulación Mercado Pago */}
      {isSimulating && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#009ee3] p-4 text-white flex justify-between items-center">
              <div className="font-bold text-lg flex items-center gap-2">
                <div className="bg-white text-[#009ee3] rounded-full p-1"><Lock className="w-4 h-4" /></div>
                Mercado Pago <span className="text-xs bg-[#008cc9] px-2 py-1 rounded ml-2 font-medium">SIMULACIÓN</span>
              </div>
              {simulationStep === 'checkout' && (
                <button onClick={() => setIsSimulating(false)}><XCircle className="w-6 h-6" /></button>
              )}
            </div>

            <div className="p-8 min-h-[350px] flex flex-col justify-center">
              {simulationStep === 'redirecting' && (
                <div className="text-center flex flex-col items-center">
                  <Loader className="w-12 h-12 text-[#009ee3] animate-spin mb-4" />
                  <p className="text-lg font-medium text-slate-700">Conectando de forma segura...</p>
                  <p className="text-sm text-slate-500 mt-2">Serás redirigido a la pasarela de pagos.</p>
                </div>
              )}
              {simulationStep === 'checkout' && (
                <div className="animate-fade-in">
                  <div className="mb-6 pb-4 border-b">
                    <p className="text-sm text-slate-500">Total a pagar a <span className="font-bold text-slate-800">Inmuebles Pro</span></p>
                    <h2 className="text-3xl font-bold text-slate-800">${amount}</h2>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Número de Tarjeta</label>
                      <input type="text" placeholder="0000 0000 0000 0000"
                        className="w-full border rounded-lg p-3 mt-1 bg-slate-50 focus:ring-2 focus:ring-[#009ee3] outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Vencimiento</label>
                        <input type="text" placeholder="MM/AA"
                          className="w-full border rounded-lg p-3 mt-1 bg-slate-50 focus:ring-2 focus:ring-[#009ee3] outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">CVV</label>
                        <input type="text" placeholder="123"
                          className="w-full border rounded-lg p-3 mt-1 bg-slate-50 focus:ring-2 focus:ring-[#009ee3] outline-none" />
                      </div>
                    </div>
                  </div>
                  <button onClick={handleProcessPayment}
                    className="w-full bg-[#009ee3] hover:bg-[#008cc9] text-white font-bold py-3 rounded-lg transition">
                    Pagar ${amount}
                  </button>
                </div>
              )}
              {simulationStep === 'processing' && (
                <div className="text-center flex flex-col items-center">
                  <Loader className="w-12 h-12 text-[#009ee3] animate-spin mb-4" />
                  <p className="text-lg font-medium text-slate-700">Procesando tu pago...</p>
                  <p className="text-sm text-slate-500 mt-2">Por favor, no cierres esta ventana.</p>
                </div>
              )}
              {simulationStep === 'success' && (
                <div className="text-center flex flex-col items-center text-emerald-600">
                  <CheckCircle className="w-16 h-16 mb-4" />
                  <p className="text-xl font-bold">¡Pago Aprobado!</p>
                  <p className="text-sm text-slate-500 mt-2">Redirigiendo de vuelta al portal...</p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 text-center border-t text-xs text-slate-400 font-medium">
              Pagos procesados de forma segura bajo estándares PCI-DSS
            </div>
          </div>
        </div>
      )}

      {/* Historial de pagos */}
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
            </tr>
          </thead>
          <tbody>
            {tenantPayments.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">Aún no hay pagos registrados.</td></tr>
            ) : tenantPayments.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-mono text-xs font-bold text-blue-600">{p.receiptNumber}</td>
                <td className="p-4 text-sm">{p.date}</td>
                <td className="p-4 font-bold text-emerald-600 text-sm">${p.amount}</td>
                <td className="p-4 text-slate-500 text-sm">{p.method}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 w-max">
                    <CheckCircle className="w-3 h-3" /> Procesado
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
