import { CONTRACT_STATUS, PAYMENT_STATUS } from '../utils/constants';
import { todayPeruISO, toPeruCalendarYMD } from '../utils/rentDueDate';

/**
 * Estado de cobranza según saldo vs mensualidad del contrato activo:
 * - Sin deuda → AL DÍA
 * - Hasta 1× mensualidad → CUOTA PENDIENTE (situación habitual al inicio o con la renta del mes en curso)
 * - Más de 1× y hasta 2× mensualidad → ATRASADO
 * - Más de 2× mensualidad → MOROSO (deuda relevante)
 */
export const getBillingStatus = (balance, monthlyRent) => {
  const b = Number(balance) || 0;
  const rent =
    monthlyRent != null && monthlyRent !== ''
      ? Number(monthlyRent)
      : NaN;

  if (b <= 0) {
    return { color: 'bg-emerald-100 text-emerald-700', label: 'AL DÍA' };
  }
  if (Number.isNaN(rent) || rent <= 0) {
    return { color: 'bg-amber-100 text-amber-800', label: 'SALDO PENDIENTE' };
  }
  if (b <= rent) {
    return { color: 'bg-sky-100 text-sky-800', label: 'CUOTA PENDIENTE' };
  }
  if (b <= rent * 2) {
    return { color: 'bg-yellow-100 text-yellow-800', label: 'ATRASADO' };
  }
  return { color: 'bg-red-100 text-red-700', label: 'MOROSO' };
};

/** Prefijo YYYY-MM del mes calendario actual en Perú (alineado con fechas de pagos). */
function currentMonthPrefixPeru() {
  const iso = todayPeruISO();
  if (!iso || iso.length < 7) return '';
  return iso.slice(0, 7);
}

/** Normaliza `payment.date` (string YYYY-MM-DD o Timestamp Firestore) a YYYY-MM-DD en Perú. */
function paymentDateYMD(p) {
  const d = p?.date;
  if (typeof d === 'string') {
    const t = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    return '';
  }
  try {
    if (d && typeof d.toDate === 'function') return toPeruCalendarYMD(d.toDate()) ?? '';
    if (d && typeof d.seconds === 'number') {
      const ms = d.seconds * 1000 + Math.floor((d.nanoseconds || d._nanoseconds || 0) / 1e6);
      return toPeruCalendarYMD(new Date(ms)) ?? '';
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * CUS06 — Métricas de cobranza desde datos en memoria.
 *
 * - totalDue: suma de alquiler mensual pactado (contratos activos).
 * - totalPending: suma de saldos pendientes de esos arrendatarios.
 * - totalPaid: **recaudado del mes** = suma de pagos PROCESADO con `date` en el mes actual (Perú)
 *   y `tenantId` con contrato activo (no usar totalDue − totalPending: con mora > 1 mes da 0 o valores falsos).
 */
export const buildReportMetrics = (tenants, contracts, payments = []) => {
  const activeContracts = contracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE);

  const activeTenants = tenants.filter((t) =>
    activeContracts.some((c) => c.tenantId === t.id)
  );

  const activeTenantIds = new Set(activeTenants.map((t) => t.id));

  const totalDue = activeContracts.reduce((sum, c) => sum + Number(c.monthlyAmount || 0), 0);
  const totalPending = activeTenants.reduce((sum, t) => sum + Number(t.balance || 0), 0);

  const monthPrefix = currentMonthPrefixPeru();
  const totalPaid = (payments || []).reduce((sum, p) => {
    if (!p || !activeTenantIds.has(p.tenantId)) return sum;
    const st = p.status;
    if (st != null && st !== '' && st !== PAYMENT_STATUS.PROCESSED) return sum;
    const ymd = paymentDateYMD(p);
    if (!monthPrefix || !ymd.startsWith(monthPrefix)) return sum;
    return sum + Number(p.amount || 0);
  }, 0);

  const recoveryRate =
    totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

  return { totalDue, totalPending, totalPaid, recoveryRate, activeTenants, activeContracts };
};

// Estado por fila en reporte / listados
export const getTenantStatus = (tenant, contract) => {
  if (!contract) {
    const b = Number(tenant?.balance) || 0;
    if (b <= 0) {
      return { color: 'bg-slate-100 text-slate-600', label: 'SIN CONTRATO ACTIVO' };
    }
    return { color: 'bg-amber-100 text-amber-800', label: 'SALDO SIN CONTRATO' };
  }
  return getBillingStatus(tenant.balance, contract.monthlyAmount);
};
