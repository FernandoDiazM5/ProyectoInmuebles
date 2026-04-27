import React, { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import { validateTenantForm } from '../../utils/validators';
import { TENANT_STATUS } from '../../utils/constants';

export default function TenantsView({ tenants, onAdd, showAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dni: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateTenantForm(form);
    if (err) { showAlert(err, 'error'); return; }
    setSaving(true);
    try {
      await onAdd(form);
      setForm({ name: '', dni: '', email: '', phone: '' });
      setShowForm(false);
      showAlert('CUS01 Exitoso: Arrendatario registrado correctamente');
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Arrendatarios</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
        >
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo Arrendatario'}
        </button>
      </div>

      {/* CUS01 - Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-blue-500 animate-fade-in">
          <h3 className="text-lg font-bold mb-4">CUS01: Registrar Nuevo Arrendatario</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
              <input type="text" value={form.name} onChange={set('name')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula / DNI *</label>
              <input type="text" value={form.dni} onChange={set('dni')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input type="text" value={form.phone} onChange={set('phone')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2 rounded-lg font-medium text-sm">
                {saving ? 'Guardando...' : 'Guardar Perfil'}
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
              <th className="p-4">Nombre</th>
              <th className="p-4">Cédula</th>
              <th className="p-4">Email</th>
              <th className="p-4">Teléfono</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">No hay arrendatarios registrados</td></tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-sm">{t.name}</td>
                <td className="p-4 text-slate-600 text-sm">{t.dni}</td>
                <td className="p-4 text-slate-600 text-sm">{t.email}</td>
                <td className="p-4 text-slate-600 text-sm">{t.phone || '-'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold
                    ${t.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.balance > 0 ? TENANT_STATUS.DELINQUENT : TENANT_STATUS.UP_TO_DATE}
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
