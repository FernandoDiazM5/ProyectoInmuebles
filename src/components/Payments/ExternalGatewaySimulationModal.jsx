import React, { useEffect, useState } from 'react';
import { Loader, Lock, Shield, Building2, XCircle, CreditCard, CheckCircle } from 'lucide-react';
import { EXTERNAL_GATEWAY_NAME, EXTERNAL_GATEWAY_TAGLINE } from '../../services/externalPaymentGateway';
import { formatCurrency } from '../../utils/formatters';

/** PAN de 16 dígitos (tarjetas débito/crédito habituales en Perú: Visa, Mastercard, etc.). */
const CARD_PAN_LENGTH_PE = 16;

function formatCardPanInput(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(0, CARD_PAN_LENGTH_PE);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiryInput(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatCvvInput(raw) {
  return String(raw).replace(/\D/g, '').slice(0, 4);
}

function cardDigitsCount(formattedPan) {
  return String(formattedPan).replace(/\D/g, '').length;
}

/**
 * Modal de handoff/checkout/callback desde un PSP externo hacia esta app.
 */
export default function ExternalGatewaySimulationModal({
  open,
  step,
  method,
  theme,
  amount,
  maxAmount,
  merchantName,
  yapeCode,
  onClose,
  onConfirmCheckout,
}) {
  const [cardPan, setCardPan] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const seed = typeof amount === 'number' ? amount : Number(amount);
  const amt = Number.isFinite(seed) && seed > 0 ? seed : 0;
  const showClose = step === 'checkout';

  useEffect(() => {
    if (open && step === 'checkout') {
      setCardPan('');
      setCardExpiry('');
      setCardCvv('');
    }
  }, [open, step]);

  const cardPanOk = cardDigitsCount(cardPan) === CARD_PAN_LENGTH_PE;
  const cardExpiryOk = /^\d{2}\/\d{2}$/.test(cardExpiry);
  const cardCvvOk = cardCvv.length === 3 || cardCvv.length === 4;
  const canAuthorizeCard = amt > 0 && cardPanOk && cardExpiryOk && cardCvvOk;

  const costLabel = (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      Costo / importe en soles (S/.) — {EXTERNAL_GATEWAY_NAME}
    </label>
  );

  const costInput = (
    <div className="mb-5">
      {costLabel}
      <input
        type="text"
        disabled
        readOnly
        value={amt > 0 ? formatCurrency(amt) : 'S/. 0'}
        title={
          maxAmount != null && Number(maxAmount) > 0
            ? `El importe lo define el comercio (tope ${formatCurrency(maxAmount)}).`
            : 'El importe lo define el comercio según tu saldo pendiente.'
        }
        className="w-full border rounded-lg p-3 text-3xl font-bold text-slate-600 outline-none bg-slate-100 border-slate-200 cursor-not-allowed tabular-nums"
      />
      <p className="text-[11px] text-slate-400 mt-1">Importe fijado por el comercio; no se puede modificar en esta pantalla.</p>
    </div>
  );

  if (!open) return null;

  const cardCheckout = (
    <div className="animate-fade-in space-y-4">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
          <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden />
          <span>Complete los datos de la tarjeta. Esta pantalla pertenece al proveedor de pago (PSP).</span>
        </div>
        <p className="text-sm text-slate-500">Comprobante solicitado por</p>
        <p className="font-semibold text-slate-900">{merchantName}</p>
        {costInput}
        <p className="text-xs text-slate-400 mt-2">
          txn-ref: EXT-{method === 'Mercado Pago' ? 'MP' : 'CR'}-{Date.now().toString().slice(-6)}
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Número de tarjeta</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={cardPan}
            onChange={(e) => setCardPan(formatCardPanInput(e.target.value))}
            className="w-full border rounded-lg p-3 mt-1 bg-white border-slate-200 text-slate-800 font-mono tracking-wide focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            {CARD_PAN_LENGTH_PE} dígitos (formato habitual en Perú).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Venc.</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
              className="w-full border rounded-lg p-3 mt-1 bg-white border-slate-200 text-slate-800 font-mono focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">CVV</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="•••"
              maxLength={4}
              value={cardCvv}
              onChange={(e) => setCardCvv(formatCvvInput(e.target.value))}
              className="w-full border rounded-lg p-3 mt-1 bg-white border-slate-200 text-slate-800 font-mono tracking-widest focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled={!canAuthorizeCard}
        onClick={() => onConfirmCheckout(amt)}
        style={{ backgroundColor: theme.accent }}
        className="w-full text-white font-bold py-3 rounded-lg hover:brightness-105 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Autorizar pago en {EXTERNAL_GATEWAY_NAME}
      </button>
    </div>
  );

  const transferCheckout = (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <Building2 className="w-6 h-6 text-emerald-700 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold text-emerald-900 text-sm">Banca abierta · autorización</p>
          <p className="text-xs text-emerald-800/90 mt-1">
            En producción, el usuario iniciaría la transferencia dentro del app de su banco o mediante redirección
            segura desde {EXTERNAL_GATEWAY_NAME}.
          </p>
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-600 mb-2">Beneficiario (recibido vía PSP)</p>
        <div className="font-mono text-sm bg-slate-100 px-3 py-2 rounded border border-slate-200">{merchantName}</div>
      </div>
      {costInput}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Referencia única PSP</label>
        <input readOnly value={`TRS-${merchantName.replace(/\s+/g, '').slice(0, 6)}-${amt.toFixed(2)}`}
          className="w-full border rounded-lg p-3 mt-1 bg-slate-100 font-mono text-sm cursor-default" />
      </div>
      <button type="button" onClick={() => onConfirmCheckout(amt)}
        style={{ backgroundColor: theme.accent }}
        className="w-full text-white font-bold py-3 rounded-lg hover:brightness-105 transition shadow">
        Registrar débito acreditado y notificar al inmobiliario
      </button>
    </div>
  );

  const yapeCheckout = (
    <div className="animate-fade-in space-y-5">
      <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900">
        La operación se concilia mediante el código que el banco móvil entregó a <strong>{EXTERNAL_GATEWAY_NAME}</strong>;
        el portal inmobiliario no genera ese código.
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Código registrado ante el PSP</p>
        <p className="font-mono text-lg font-bold tracking-widest">{yapeCode || '—'}</p>
      </div>
      {costInput}
      <button type="button" onClick={() => onConfirmCheckout(amt)}
        style={{ backgroundColor: theme.accent }}
        className="w-full text-white font-bold py-3 rounded-lg hover:brightness-105 transition shadow">
        Confirmar notificación PSP → Inmuebles Pro
      </button>
    </div>
  );

  let checkoutBody;
  if (method === 'Yape') checkoutBody = yapeCheckout;
  else if (method === 'Transferencia Bancaria') checkoutBody = transferCheckout;
  else checkoutBody = cardCheckout;

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ext-gateway-title">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`bg-gradient-to-r ${theme.gradient} text-white px-4 py-4 shrink-0`}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <p id="ext-gateway-title" className="font-black text-lg leading-tight flex items-center gap-2 tracking-tight">
                <Shield className="w-5 h-5 opacity-95" aria-hidden />
                {EXTERNAL_GATEWAY_NAME}
              </p>
              <p className="text-[11px] font-semibold opacity-95 mt-1 uppercase tracking-wide">Proveedor externo · autorización</p>
              <p className="text-[10px] opacity-85 mt-0.5">{theme.channelLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {showClose && (
                <button type="button" onClick={onClose} aria-label="Cerrar ventana del proveedor externo">
                  <XCircle className="w-7 h-7 opacity-95 hover:opacity-100 transition" />
                </button>
              )}
              <span className="text-[10px] font-bold uppercase bg-black/25 px-2 py-0.5 rounded">PSP</span>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 min-h-[320px] flex flex-col justify-center">
          {step === 'redirecting' && (
            <div className="text-center flex flex-col items-center px-2">
              <Loader className="w-14 h-14 mb-4 animate-spin" style={{ color: theme.accent }} />
              <p className="text-lg font-semibold text-slate-800">Conectando al servicio externo…</p>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                Abriendo sesión protegida con <strong>{EXTERNAL_GATEWAY_NAME}</strong>.
                Esta capa está fuera del dominio «Inmuebles Pro».
              </p>
              <Lock className="w-10 h-10 text-slate-300 mt-6" aria-hidden />
            </div>
          )}
          {step === 'checkout' && checkoutBody}
          {step === 'processing' && (
            <div className="text-center flex flex-col items-center px-2">
              <Loader className="w-14 h-14 mb-5 animate-spin" style={{ color: theme.accent }} />
              <p className="text-lg font-medium text-slate-800">{EXTERNAL_GATEWAY_NAME} procesando…</p>
              <p className="text-sm text-slate-500 mt-2">Espere una respuesta de autorización antes de registrar el saldo aquí.</p>
            </div>
          )}
          {step === 'success' && (
            <div className="text-center flex flex-col items-center text-emerald-600 px-2">
              <CheckCircle className="w-16 h-16 mb-4" />
              <p className="text-xl font-bold text-slate-800">Operación autorizada</p>
              <p className="text-sm text-slate-500 mt-3">
                Callback: el PSP notifica resultado <strong>Aprobado</strong> al sistema inmobiliario.
              </p>
              <CreditCard className="w-8 h-8 text-emerald-200 mt-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 text-[11px] text-slate-500 leading-snug flex gap-2">
          <Shield className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
          <span>{EXTERNAL_GATEWAY_TAGLINE}</span>
        </div>
      </div>
    </div>
  );
}
