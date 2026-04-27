import React, { useState, useEffect, useCallback } from 'react';
import { Home, Users, FileText, CreditCard, BarChart, AlertTriangle } from 'lucide-react';

import { logoutUser } from '../services/authService';
import { useProperties } from '../hooks/useProperties';
import { useTenants } from '../hooks/useTenants';
import { useContracts } from '../hooks/useContracts';
import { usePayments } from '../hooks/usePayments';
import { ROLES, CONTRACT_STATUS, ALERT_TIMEOUT_MS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

import Sidebar from './Layout/Sidebar';
import Alert from './Layout/Alert';
import StatCard from './Dashboard/StatCard';
import TenantsView from './Tenants/TenantsView';
import ContractsView from './Contracts/ContractsView';
import AgentPaymentsView from './Payments/AgentPaymentsView';
import TenantPortalView from './Payments/TenantPortalView';
import ReportsView from './Reports/ReportsView';
import AdminView from './Admin/AdminView';

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
  const { tenants, setTenants, fetchTenants, addTenant, removeTenant } = useTenants();
  const { contracts, fetchContracts, addContract, endContract } = useContracts();
  const { payments, fetchPayments, addPayment } = usePayments();

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
        await Promise.all([fetchTenants(), fetchContracts()]);
      }
    };
    load();
  }, [role]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const currentTenant = role === ROLES.TENANT
    ? tenants.find((t) => t.email === currentUser.email)
    : null;

  const AgentDashboard = () => (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Panel Principal — Agente</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Propiedades Disponibles"
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
          value={tenants.filter((t) => t.balance > 0).length}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="bg-red-500"
        />
      </div>

      {tenants.filter((t) => t.balance > 0).length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b bg-red-50">
            <h3 className="font-bold text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Arrendatarios con Saldo Pendiente
            </h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
                <th className="p-4">Nombre</th>
                <th className="p-4">Saldo</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tenants.filter((t) => t.balance > 0).map((t) => (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium text-sm">{t.name}</td>
                  <td className="p-4 font-bold text-red-600 text-sm">{formatCurrency(t.balance)}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                      MOROSO
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderView = () => {
    if (role === ROLES.ADMIN) {
      return <AdminView />;
    }

    if (role === ROLES.AGENT) {
      if (currentView === 'dashboard') return <AgentDashboard />;
      if (currentView === 'tenants')
        return (
          <TenantsView
            tenants={tenants}
            onAdd={async (data) => {
              await addTenant(data);
              await fetchTenants();
            }}
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
            currentUserRole={role}
          />
        );
    }

    if (role === ROLES.TENANT && currentView === 'tenant_portal') {
      return (
        <TenantPortalView
          tenant={currentTenant}
          payments={payments}
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
