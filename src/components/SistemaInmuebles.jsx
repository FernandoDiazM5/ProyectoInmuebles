import React, { useState, useEffect, useCallback } from 'react';
import { Home, Users, FileText, CreditCard, BarChart, AlertTriangle } from 'lucide-react';

import { logoutUser } from '../services/authService';
import { getContractsByTenant } from '../services/contractService';
import { useProperties } from '../hooks/useProperties';
import { useTenants } from '../hooks/useTenants';
import { useContracts } from '../hooks/useContracts';
import { usePayments } from '../hooks/usePayments';
import { ROLES, CONTRACT_STATUS, ALERT_TIMEOUT_MS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { getBillingStatus } from '../services/reportService';

import Sidebar from './Layout/Sidebar';
import Alert from './Layout/Alert';
import StatCard from './Dashboard/StatCard';
import TenantsView from './Tenants/TenantsView';
import ContractsView from './Contracts/ContractsView';
import AgentPaymentsView from './Payments/AgentPaymentsView';
import TenantPortalView from './Payments/TenantPortalView';
import ReportsView from './Reports/ReportsView';
import AdminView from './Admin/AdminView';
import PropertiesView from './Properties/PropertiesView';

function useAlert() {
  const [alert, setAlert] = useState(null);
  const showAlert = useCallback((msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), ALERT_TIMEOUT_MS);
  }, []);
  return { alert, showAlert };
}

const defaultView = {
  [ROLES.ADMIN]:  'user_admin',
  [ROLES.AGENT]:  'dashboard',
  [ROLES.TENANT]: 'tenant_portal',
  [ROLES.OWNER]:  'reports',
};

export default function SistemaInmuebles({ currentUser, setCurrentUser }) {
  const { role, id: userId } = currentUser;
  const [currentView, setCurrentView] = useState(defaultView[role] ?? 'dashboard');
  const { alert, showAlert } = useAlert();

  const { properties, setProperties, fetchProperties } = useProperties();
  const { tenants, setTenants, fetchTenants, addTenant, removeTenant, loading: tenantsLoading } = useTenants();
  const { contracts, setContracts, fetchContracts, addContract, endContract } = useContracts();
  const { payments, fetchPayments, addPayment, loading: paymentsLoading } = usePayments();

  // CRÍTICO FIX: se agregó await para evitar race condition en carga inicial
  useEffect(() => {
    const load = async () => {
      if (role === ROLES.ADMIN) {
        // Admin solo gestiona usuarios, no necesita datos del negocio
      } else if (role === ROLES.AGENT) {
        await Promise.all([fetchProperties(), fetchTenants(), fetchContracts(), fetchPayments()]);
      } else if (role === ROLES.TENANT) {
        await Promise.all([fetchTenants(), fetchPayments()]);
      } else if (role === ROLES.OWNER) {
        await Promise.all([fetchTenants(), fetchContracts(), fetchPayments()]);
      }
    };
    load();
  }, [role]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const currentTenant = role === ROLES.TENANT
    ? tenants.find(
        (t) =>
          (t.authUid && t.authUid === currentUser.id) ||
          String(t.email || '').toLowerCase() === String(currentUser.email || '').toLowerCase()
      )
    : null;

  /** Solo los contratos del inquilino (no confundir con la lista global del agente). */
  useEffect(() => {
    if (role !== ROLES.TENANT) return;
    if (!currentTenant?.id) {
      setContracts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await getContractsByTenant(currentTenant.id);
        if (!cancelled) setContracts(list);
      } catch {
        if (!cancelled) setContracts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, currentTenant?.id, setContracts]);

  const AgentDashboard = () => {
    const activeContractForTenant = (tenantId) =>
      contracts.find((c) => c.tenantId === tenantId && c.status === CONTRACT_STATUS.ACTIVE);

    const propertyBriefByContract = (contract) => {
      if (!contract?.propertyId) return '—';
      const p = properties.find((pr) => pr.id === contract.propertyId);
      if (!p) return '—';
      const door = p.propertyNumber ?? p.doorNumber;
      const bits = [];
      if (door != null && String(door).trim() !== '') bits.push(`Pta ${door}`);
      if (p.floor != null && p.floor !== '') bits.push(`Piso ${p.floor}`);
      return bits.length > 0 ? bits.join(' · ') : String(p.address || '—').slice(0, 48) || '—';
    };

    const billingForTenant = (t) =>
      getBillingStatus(t.balance, activeContractForTenant(t.id)?.monthlyAmount ?? null);

    const tenantsWithDebt = tenants.filter((t) => Number(t.balance) > 0);
    const morosoCount = tenantsWithDebt.filter((t) => billingForTenant(t).label === 'MOROSO').length;

    return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Panel Principal — Agente</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Departamentos Disponibles"
          value={properties.filter((p) => p.status === 'DISPONIBLE').length}
          icon={<Home className="w-6 h-6" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Arrendatarios Activos"
          value={tenants.filter((t) => t.propertyId).length}
          icon={<Users className="w-6 h-6" />}
          color="bg-indigo-500"
        />
        <StatCard
          title="Contratos Activos"
          value={contracts.filter((c) => c.status === CONTRACT_STATUS.ACTIVE).length}
          icon={<FileText className="w-6 h-6" />}
          color="bg-purple-500"
        />
        <StatCard
          title="Morosos"
          value={morosoCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="bg-red-500"
        />
      </div>

      {tenantsWithDebt.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" /> Saldos pendientes de cobro
            </h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[44rem]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
                <th className="p-3 whitespace-nowrap">Arrendatario</th>
                <th className="p-3 whitespace-nowrap">DNI</th>
                <th className="p-3 whitespace-nowrap">Contrato</th>
                <th className="p-3">Unidad</th>
                <th className="p-3 whitespace-nowrap text-right">Alquiler / mes</th>
                <th className="p-3 whitespace-nowrap">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tenantsWithDebt.map((t) => {
                const info = billingForTenant(t);
                const contract = activeContractForTenant(t.id);
                const unitLabel = propertyBriefByContract(contract);
                return (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium text-sm max-w-[10rem]">
                    <div className="truncate" title={t.name}>{t.name}</div>
                  </td>
                  <td className="p-3 text-sm text-slate-600 font-mono">{t.dni || '—'}</td>
                  <td className="p-3 text-xs font-mono text-blue-700 font-semibold whitespace-nowrap">
                    {contract?.contractNumber ?? '—'}
                  </td>
                  <td className="p-3 text-sm text-slate-700 max-w-[12rem]">
                    <span className="block truncate" title={unitLabel}>{unitLabel}</span>
                  </td>
                  <td className="p-3 text-sm tabular-nums text-right text-slate-700">
                    {formatCurrency(contract?.monthlyAmount ?? 0)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${info.color}`}>
                      {info.label}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderView = () => {
    if (role === ROLES.ADMIN) {
      return <AdminView />;
    }

    if (role === ROLES.AGENT) {
      if (currentView === 'dashboard') return <AgentDashboard />;
      if (currentView === 'properties') return <PropertiesView properties={properties} />;
      if (currentView === 'tenants')
        return (
          <TenantsView
            tenants={tenants}
            contracts={contracts}
            onAdd={(data) => addTenant(data)}
            onDelete={async (id) => {
              await removeTenant(id);
              await Promise.all([fetchContracts(), fetchPayments(), fetchProperties()]);
            }}
            showAlert={showAlert}
          />
        );
      if (currentView === 'contracts')
        return (
          <ContractsView
            contracts={contracts}
            tenants={tenants}
            properties={properties}
            onAdd={async (data) => {
              const result = await addContract(data);
              await Promise.all([fetchTenants(), fetchProperties(), fetchContracts()]);
              return result;
            }}
            onTerminate={async (contractId, propertyId, tenantId) => {
              await endContract(contractId, propertyId, tenantId);
              await Promise.all([fetchTenants(), fetchProperties(), fetchContracts()]);
            }}
            showAlert={showAlert}
          />
        );
      if (currentView === 'payments')
        return (
          <AgentPaymentsView
            tenants={tenants}
            payments={payments}
            onPay={async (data) => {
              const result = await addPayment(data);
              await Promise.all([fetchTenants(), fetchPayments()]);
              return result;
            }}
            showAlert={showAlert}
          />
        );
      if (currentView === 'reports')
        return (
          <ReportsView
            tenants={tenants}
            contracts={contracts}
            payments={payments}
            currentUserRole={role}
          />
        );
    }

    if (role === ROLES.TENANT && currentView === 'tenant_portal') {
      return (
        <TenantPortalView
          tenant={currentTenant}
          contracts={contracts}
          payments={payments}
          loading={tenantsLoading || paymentsLoading}
          onPay={async (data) => {
            const result = await addPayment(data);
            await Promise.all([fetchTenants(), fetchPayments()]);
            return result;
          }}
          showAlert={showAlert}
        />
      );
    }

    if (role === ROLES.OWNER && currentView === 'reports') {
      return (
        <ReportsView
          tenants={tenants}
          contracts={contracts}
          payments={payments}
          currentUserRole={role}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-8 overflow-y-auto">
        <Alert alert={alert} />
        {renderView()}
      </main>
    </div>
  );
}
