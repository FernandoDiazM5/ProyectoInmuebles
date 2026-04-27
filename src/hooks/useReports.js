import { useMemo } from 'react';
import { buildReportMetrics, getTenantStatus } from '../services/reportService';
import { CONTRACT_STATUS } from '../utils/constants';

export const useReports = (tenants, contracts) => {
  const metrics = useMemo(
    () => buildReportMetrics(tenants, contracts),
    [tenants, contracts]
  );

  const tenantRows = useMemo(() =>
    metrics.activeTenants.map((tenant) => {
      const contract = contracts.find(
        (c) => c.tenantId === tenant.id && c.status === CONTRACT_STATUS.ACTIVE
      );
      const statusInfo = getTenantStatus(tenant, contract);
      return { tenant, contract, statusInfo };
    }),
    [metrics.activeTenants, contracts]
  );

  return { ...metrics, tenantRows };
};
