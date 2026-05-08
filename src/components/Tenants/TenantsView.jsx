import React, { useState } from 'react';
import { Plus, XCircle, Trash2 } from 'lucide-react';
import { validateTenantForm, isValidPhone, formatPhoneNine } from '../../utils/validators';
import { CONTRACT_STATUS } from '../../utils/constants';
import ConfirmDialog from '../Layout/ConfirmDialog';
import SuccessDialog from '../Layout/SuccessDialog';
import { getBillingStatus } from '../../services/reportService';

export default function TenantsView({ tenants, contracts = [], onAdd, onDelete, showAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dni: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { id, name } | null
  const [deleting, setDeleting] = useState(false);
  const [successDetail, setSuccessDetail] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleDniChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 8);
    setForm((f) => ({ ...f, dni: v }));
  };

  const handlePhoneChange = (e) => {
    setForm((f) => ({ ...f, phone: formatPhoneNine(e.target.value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateTenantForm(form);
    if (err) { showAlert(err, 'error'); return; }
    if (!isValidPhone(form.phone)) {
      showAlert('Si ingresa teléfono debe completar los 9 dígitos.', 'error'); return;
    }

    const submittedName = form.name.trim();
    const payload = { ...form, phone: formatPhoneNine(form.phone).trim() };

    setSaving(true);
    try {
      await onAdd(payload);
      setForm({ name: '', dni: '', email: '', phone: '' });
      setShowForm(false);
      setSuccessDetail({
        tenantName: submittedName,
      });
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const { id, name } = confirm;
    setConfirm(null);
    setDeleting(true);
    try {
      await onDelete(id);
      showAlert(`Arrendatario "${name}" eliminado junto con sus contratos y pagos.`);
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <ConfirmDialog
        open={!!confirm}
        title="Eliminar Arrendatario"
        message={`¿Eliminar a "${confirm?.name}"? Se eliminarán en cascada todos sus contratos y pagos. Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirm(null)}
      />

      <SuccessDialog
        open={!!successDetail}
        onClose={() => setSuccessDetail(null)}
        title="Registro guardado"
        message={
          successDetail?.tenantName
            ? `${successDetail.tenantName} recibirá indicaciones por correo para acceder al portal.`
            : ''
        }
      />

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

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-blue-500 animate-fade-in">
          <h3 className="text-lg font-bold mb-1">Registrar Nuevo Arrendatario</h3>
          <p className="text-sm text-slate-500 mb-4">
            Complete los datos del arrendatario.
          </p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre Completo *</label>
              <input type="text" value={form.name} onChange={set('name')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                DNI <span className="text-slate-400 font-normal">(8 dígitos)</span> *
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={form.dni}
                onChange={handleDniChange}
                placeholder="12345678"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Teléfono <span className="text-slate-400 font-normal">(opcional, 9 dígitos)</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={handlePhoneChange}
                placeholder="999 999 999"
                autoComplete="tel"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
              />
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">Nombre</th>
              <th className="p-4">Cédula</th>
              <th className="p-4">Email</th>
              <th className="p-4">Teléfono</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-sm">No hay arrendatarios registrados</td></tr>
            )}
            {tenants.map((t) => {
              const activeContract = contracts.find(
                (c) => c.tenantId === t.id && c.status === CONTRACT_STATUS.ACTIVE
              );
              const statusInfo = getBillingStatus(t.balance, activeContract?.monthlyAmount ?? null);

              return (
              <tr key={t.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-sm">{t.name}</td>
                <td className="p-4 text-slate-600 text-sm">{t.dni}</td>
                <td className="p-4 text-slate-600 text-sm">{t.email}</td>
                <td className="p-4 text-slate-600 text-sm">{t.phone || '-'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => setConfirm({ id: t.id, name: t.name })}
                    disabled={deleting}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800
                               border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg transition disabled:opacity-50"
                    title="Eliminar en cascada (contratos + pagos)"
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
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
