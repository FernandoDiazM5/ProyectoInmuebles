import React from 'react';
import { Home, Users, FileText, CreditCard, BarChart, LogOut, Shield } from 'lucide-react';
import { ROLES } from '../../utils/constants';

function SidebarItem({ icon, label, view, currentView, onClick }) {
  const active = currentView === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-sm
        ${active ? 'bg-blue-600 text-white font-medium shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

const ROLE_BADGE = {
  [ROLES.ADMIN]:  { label: 'Administrador', cls: 'bg-purple-600/30 text-purple-300' },
  [ROLES.AGENT]:  { label: 'Agente',        cls: 'bg-blue-600/30 text-blue-300'   },
  [ROLES.TENANT]: { label: 'Arrendatario',  cls: 'bg-emerald-600/30 text-emerald-300' },
  [ROLES.OWNER]:  { label: 'Propietario',   cls: 'bg-slate-600/30 text-slate-300'  },
};

export default function Sidebar({ currentUser, currentView, setCurrentView, onLogout }) {
  const { role, name } = currentUser;
  const badge = ROLE_BADGE[role] ?? { label: role, cls: 'bg-slate-600/30 text-slate-300' };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Home className="text-blue-400 w-5 h-5" /> Inmuebles Pro
        </h2>
        <p className="text-xs text-slate-400 mt-2 truncate" title={name}>
          {name}
        </p>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {role === ROLES.ADMIN && (
          <SidebarItem
            icon={<Shield />}
            label="Gestión de Usuarios"
            view="user_admin"
            currentView={currentView}
            onClick={setCurrentView}
          />
        )}

        {role === ROLES.AGENT && (
          <>
            <SidebarItem icon={<Home />}       label="Dashboard"            view="dashboard"   currentView={currentView} onClick={setCurrentView} />
            <SidebarItem icon={<Users />}      label="Arrendatarios"        view="tenants"     currentView={currentView} onClick={setCurrentView} />
            <SidebarItem icon={<FileText />}   label="Contratos"            view="contracts"   currentView={currentView} onClick={setCurrentView} />
            <SidebarItem icon={<CreditCard />} label="Pagos"                view="payments"    currentView={currentView} onClick={setCurrentView} />
            <SidebarItem icon={<BarChart />}   label="Reportes de Cobranza" view="reports"     currentView={currentView} onClick={setCurrentView} />
          </>
        )}

        {role === ROLES.TENANT && (
          <SidebarItem icon={<CreditCard />} label="Mi Portal de Pagos" view="tenant_portal" currentView={currentView} onClick={setCurrentView} />
        )}

        {role === ROLES.OWNER && (
          <SidebarItem icon={<BarChart />} label="Reportes de Cobranza" view="reports" currentView={currentView} onClick={setCurrentView} />
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-white w-full px-4 py-2 rounded-lg transition text-sm"
        >
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
