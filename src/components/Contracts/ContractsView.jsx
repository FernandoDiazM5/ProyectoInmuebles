import React, { useState } from 'react';
import { Plus, XCircle, FileDown } from 'lucide-react';
import { validateContractForm } from '../../utils/validators';
import { CONTRACT_STATUS, CONTRACT_DURATIONS } from '../../utils/constants';
import { generateContractPDF } from '../../services/pdfService';

export default function ContractsView({ contracts, tenants, properties, onAdd, onTerminate, showAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenantId: '', propertyId: '', amount: '', duration: 12 });
  const [saving, setSaving] = useState(false);

  const availableProperties = properties.filter((p) => p.status === 'DISPONIBLE');
  const tenantsWithoutContract = tenants.filter(
    (t) => !contracts.some((c) => c.tenantId === t.id && c.status === CONTRACT_STATUS.ACTIVE)
  );

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSelectProperty = (e) => {
    const prop = properties.find((p) => p.id === e.target.value);
    setForm((f) => ({ ...f, propertyId: e.target.value, amount: prop ? prop.price : '' }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const err = validateContractForm(form);
    if (err) { showAlert(err, 'error'); return; }
    setSaving(true);
    try {
      const { contractNumber } = await onAdd(form);

      // CUS02 - Generar PDF del contrato
      const tenant = tenants.find((t) => t.id === form.tenantId);
      const property = properties.find((p) => p.id === form.propertyId);
      generateContractPDF({
        contract: { contractNumber, ...form, startDate: new Date().toISOString().slice(0, 10), status: 'ACTIVO' },
        tenant,
        property,
      });

      setForm({ tenantId: '', propertyId: '', amount: '', duration: 12 });
      setShowForm(false);
      showAlert(`CUS02 Exitoso: Contrato ${contractNumber} generado. PDF descargado.`);
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminate = async (contract) => {
    const tenant = tenants.find((t) => t.id === contract.tenantId);
    if (tenant?.balance > 0) {
      showAlert('CUS03 Error: El arrendatario tiene saldo pendiente. Debe pagarlo primero.', 'error');
      return;
    }
    if (!window.confirm(`¿Desea finalizar el contrato ${contract.contractNumber}?`)) return;
    try {
      await onTerminate(contract.id, contract.propertyId, contract.tenantId);
      showAlert('CUS03 Exitoso: Contrato terminado y propiedad liberada.');
    } catch (ex) {
      showAlert(ex.message, 'error');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Contratos</h2>
        <button onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Generar Contrato'}
        </button>
      </div>

      {/* CUS02 - Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-purple-500 animate-fade-in">
          <h3 className="text-lg font-bold mb-4">CUS02: Generar Nuevo Contrato Automático</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Arrendatario *</label>
              <select value={form.tenantId} onChange={set('tenantId')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
                <option value="">Seleccione Inquilino</option>
                {tenantsWithoutContract.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.dni})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Propiedad Disponible *</label>
              <select value={form.propertyId} onChange={handleSelectProperty}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
                <option value="">Seleccione Inmueble</option>
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id}>{p.address} — ${p.price}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto Mensual ($) *</label>
              <input type="number" value={form.amount} onChange={set('amount')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duración *</label>
              <select value={form.duration} onChange={set('duration')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
                {CONTRACT_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                {saving ? 'Generando...' : 'Generar y Descargar PDF'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">N° Contrato</th>
              <th className="p-4">Arrendatario</th>
              <th className="p-4">Monto/Mes</th>
              <th className="p-4">Duración</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-sm">No hay contratos registrados</td></tr>
            )}
            {contracts.map((c) => {
              const t = tenants.find((x) => x.id === c.tenantId);
              return (
                <tr key={c.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-4 font-mono text-xs text-blue-600 font-bold">{c.contractNumber}</td>
                  <td className="p-4 font-medium text-sm">{t?.name ?? 'Desconocido'}</td>
                  <td className="p-4 text-sm">${c.monthlyAmount}</td>
                  <td className="p-4 text-sm text-slate-600">{c.duration} meses</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                      ${c.status === CONTRACT_STATUS.ACTIVE ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {c.status === CONTRACT_STATUS.ACTIVE && (
                      <button onClick={() => handleTerminate(c)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium">
                        CUS03: Terminar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
