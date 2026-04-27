import { CONTRACT_STATUS, COLLECTION_GOAL_PERCENT } from '../utils/constants';

// CUS06 - Calcular métricas de cobranza desde datos en memoria
export const buildReportMetrics = (tenants, contracts) => {
  const activeContracts = contracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE);

  const activeTenants = tenants.filter((t) =>
    activeContracts.some((c) => c.tenantId === t.id)
  );

  const totalDue = activeContracts.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);
  const totalPending = activeTenants.reduce((sum, t) => sum + (t.balance || 0), 0);
  const totalPaid = Math.max(0, totalDue - totalPending);
  const recoveryRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;
  const meetsGoal = recoveryRate >= COLLECTION_GOAL_PERCENT;

  return { totalDue, totalPending, totalPaid, recoveryRate, meetsGoal, activeTenants, activeContracts };
};

// Calcula estado por arrendatario para la tabla de reporte
export const getTenantStatus = (tenant, contract) => {
  if (!contract) return { color: 'bg-slate-100 text-slate-500', label: 'SIN CONTRATO' };
  if (tenant.balance <= 0) return { color: 'bg-emerald-100 text-emerald-700', label: 'AL DÍA' };
  if (tenant.balance <= contract.monthlyAmount) return { color: 'bg-yellow-100 text-yellow-700', label: 'ATRASADO' };
  return { color: 'bg-red-100 text-red-700', label: 'MOROSO' };
};
