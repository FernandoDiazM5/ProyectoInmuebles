import React from 'react';
import { FileDown, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { useReports } from '../../hooks/useReports';
import { COLLECTION_GOAL_PERCENT, ROLES } from '../../utils/constants';

export default function ReportsView({ tenants, contracts, currentUserRole }) {
  const { totalDue, totalPaid, totalPending, recoveryRate, meetsGoal, tenantRows } =
    useReports(tenants, contracts);

  const isOwner = currentUserRole === ROLES.OWNER;

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CUS06: Reportes de Cobranza</h2>
          {isOwner && <p className="text-red-500 text-sm font-medium mt-1">Vista Restringida (Propietario)</p>}
        </div>
        <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <FileDown className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-slate-500 text-sm">Total Esperado (Mes)</p>
          <h4 className="text-2xl font-bold">${totalDue}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
          <p className="text-slate-500 text-sm">Total Recaudado</p>
          <h4 className="text-2xl font-bold">${totalPaid}</h4>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-slate-500 text-sm">Total Pendiente (Morosidad)</p>
          <h4 className="text-2xl font-bold">${totalPending}</h4>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-white">
          <p className="text-slate-400 text-sm">Tasa de Cobranza (Obj. {COLLECTION_GOAL_PERCENT}%)</p>
          <div className="flex items-end gap-2 mt-1">
            <h4 className="text-3xl font-bold">{recoveryRate}%</h4>
            {meetsGoal
              ? <CheckCircle className="text-emerald-400 mb-1 w-5 h-5" />
              : <AlertTriangle className="text-yellow-400 mb-1 w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Tabla por inquilino */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm">Estado de Cuenta por Inquilino</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Buscar..."
              className="pl-9 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">Arrendatario</th>
              <th className="p-4">Contrato</th>
              <th className="p-4">Monto Mensual</th>
              <th className="p-4">Saldo Pendiente</th>
              <th className="p-4">Indicador de Estado</th>
            </tr>
          </thead>
          <tbody>
            {tenantRows.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">Sin datos de cobranza</td></tr>
            )}
            {tenantRows.map(({ tenant, contract, statusInfo }) => (
              <tr key={tenant.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-sm">{tenant.name}</td>
                <td className="p-4 text-slate-500 text-xs font-mono">{contract?.contractNumber ?? 'N/A'}</td>
                <td className="p-4 text-sm">${contract?.monthlyAmount ?? 0}</td>
                <td className="p-4 font-bold text-sm">${tenant.balance}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
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
