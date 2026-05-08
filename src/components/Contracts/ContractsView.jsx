import React, { useState, useMemo } from 'react';
import { Plus, XCircle, FileText } from 'lucide-react';
import { validateContractForm } from '../../utils/validators';
import { CONTRACT_STATUS, CONTRACT_DURATIONS } from '../../utils/constants';
import { generateContractPDF, getContractPdfBlobUrl } from '../../services/pdfService';
import { formatCurrency } from '../../utils/formatters';
import ConfirmDialog from '../Layout/ConfirmDialog';
import SuccessDialog from '../Layout/SuccessDialog';

function createdAtMillis(c) {
  const ts = c.createdAt;
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
  return null;
}

function sortContractsOldestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = createdAtMillis(a) ?? Number(new Date(`${a.startDate ?? ''}T12:00:00`).getTime() || 0);
    const tb = createdAtMillis(b) ?? Number(new Date(`${b.startDate ?? ''}T12:00:00`).getTime() || 0);
    if (ta !== tb) return ta - tb;
    return String(a.contractNumber ?? '').localeCompare(String(b.contractNumber ?? ''), undefined, {
      numeric: true,
    });
  });
}

function buildPdfContext(c, tenants, properties) {
  const tenant = tenants.find((x) => x.id === c.tenantId);
  const property = properties.find((x) => x.id === c.propertyId);
  if (!tenant || !property) return null;
  return {
    contract: {
      contractNumber: c.contractNumber,
      startDate: c.startDate,
      duration: c.duration,
      monthlyAmount: c.monthlyAmount,
      status: c.status,
    },
    tenant,
    property,
  };
}

export default function ContractsView({ contracts, tenants, properties, onAdd, onTerminate, showAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenantId: '', propertyId: '', amount: '', duration: 12 });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successContractNumber, setSuccessContractNumber] = useState('');

  const availableProperties = properties.filter((p) => p.status === 'DISPONIBLE');

  const singleSiteAddressAvailable = useMemo(() => {
    const addrs = [...new Set(availableProperties.map((p) => String(p.address ?? '').trim()).filter(Boolean))];
    if (addrs.length === 1) return addrs[0];
    return null;
  }, [availableProperties]);

  const sortedContracts = useMemo(() => sortContractsOldestFirst(contracts ?? []), [contracts]);

  const tenantsWithoutContract = tenants.filter(
    (t) => !contracts.some((c) => c.tenantId === t.id && c.status === CONTRACT_STATUS.ACTIVE)
  );

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSelectProperty = (e) => {
    const prop = properties.find((p) => p.id === e.target.value);
    setForm((f) => ({ ...f, propertyId: e.target.value, amount: prop ? prop.price : '' }));
  };

  const openPdfPreview = (c) => {
    const ctx = buildPdfContext(c, tenants, properties);
    if (!ctx) {
      showAlert('No se pueden cargar datos del contrato para el PDF.', 'error');
      return;
    }
    const url = getContractPdfBlobUrl(ctx);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      URL.revokeObjectURL(url);
      showAlert('El navegador bloqueó la ventana. Permita ventanas emergentes para ver el PDF.', 'error');
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  };

  const downloadPdf = (c) => {
    const ctx = buildPdfContext(c, tenants, properties);
    if (!ctx) {
      showAlert('No se pueden cargar datos del contrato para el PDF.', 'error');
      return;
    }
    generateContractPDF(ctx);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const err = validateContractForm(form);
    if (err) {
      showAlert(err, 'error');
      return;
    }
    setSaving(true);
    try {
      const { contractNumber } = await onAdd(form);

      setForm({ tenantId: '', propertyId: '', amount: '', duration: 12 });
      setShowForm(false);
      setSuccessContractNumber(contractNumber);
      setSuccessOpen(true);
    } catch (ex) {
      showAlert(ex.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestTerminate = (contract) => {
    const tn = tenants.find((t) => t.id === contract.tenantId);
    if (tn?.balance > 0) {
      showAlert('El arrendatario tiene saldo pendiente. Debe pagarlo primero.', 'error');
      return;
    }
    setConfirm({ contract });
  };

  const handleConfirmTerminate = async () => {
    const { contract } = confirm;
    setConfirm(null);
    try {
      await onTerminate(contract.id, contract.propertyId, contract.tenantId);
      showAlert('Contrato terminado y departamento liberado.');
    } catch (ex) {
      showAlert(ex.message, 'error');
    }
  };

  return (
    <div>
      <SuccessDialog
        open={successOpen}
        title="Contrato generado"
        message={`El contrato ${successContractNumber} se registró correctamente. Puede ver o descargar el PDF desde la columna Contrato en la tabla.`}
        onClose={() => setSuccessOpen(false)}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Terminar Contrato"
        message={`¿Desea finalizar el contrato ${confirm?.contract?.contractNumber}? Esta acción liberará el departamento y marcará al arrendatario como inactivo.`}
        onConfirm={handleConfirmTerminate}
        onCancel={() => setConfirm(null)}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Contratos</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Generar Contrato'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4 border-purple-500 animate-fade-in">
          <h3 className="text-lg font-bold mb-4">Generar nuevo contrato</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Arrendatario *</label>
              <select value={form.tenantId} onChange={set('tenantId')}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
                <option value="">Seleccione arrendatario</option>
                {tenantsWithoutContract.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.dni})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Departamento disponible *</label>
              <select value={form.propertyId} onChange={handleSelectProperty}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none">
                <option value="">Seleccione departamento</option>
                {availableProperties.map((p) => {
                  const door = (p.propertyNumber ?? p.doorNumber) != null && String(p.propertyNumber ?? p.doorNumber) !== ''
                    ? `${p.propertyNumber ?? p.doorNumber}`
                    : null;
                  const doorLabel = door ? `Puerta ${door}` : 'Unidad';
                  const pis = p.floor != null ? ` · Piso ${p.floor}` : '';
                  const priceStr = formatCurrency(p.price);
                  const label =
                    singleSiteAddressAvailable != null
                      ? `${doorLabel}${pis} — ${priceStr}`
                      : `${doorLabel} · ${p.address} — ${priceStr}`;
                  return (
                    <option key={p.id} value={p.id}>{label}</option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto mensual (S/.) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                disabled
                title="Se toma del alquiler mensual del departamento seleccionado"
                className="w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-600 bg-slate-50 cursor-not-allowed outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">Definido por el departamento elegido.</p>
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
                <FileText className="w-4 h-4" />
                {saving ? 'Guardando…' : 'Registrar contrato'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">N° Contrato</th>
              <th className="p-4">Arrendatario</th>
              <th className="p-4">Monto / mes</th>
              <th className="p-4">Duración</th>
              <th className="p-4">Estado</th>
              <th className="p-4 whitespace-nowrap w-[10rem]">Contrato</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sortedContracts.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">No hay contratos registrados</td></tr>
            )}
            {sortedContracts.map((c) => {
              const t = tenants.find((x) => x.id === c.tenantId);
              const canPdf = !!(t && properties.find((x) => x.id === c.propertyId));
              return (
                <tr key={c.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-4 font-mono text-xs text-blue-600 font-bold">{c.contractNumber}</td>
                  <td className="p-4 font-medium text-sm">{t?.name ?? 'Desconocido'}</td>
                  <td className="p-4 text-sm">{formatCurrency(c.monthlyAmount)}</td>
                  <td className="p-4 text-sm text-slate-600">{c.duration} meses</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                      ${c.status === CONTRACT_STATUS.ACTIVE ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 align-middle">
                    {canPdf ? (
                      <div className="flex flex-col gap-1.5 min-w-[8.5rem]">
                        <button
                          type="button"
                          onClick={() => openPdfPreview(c)}
                          className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 shadow-sm hover:bg-indigo-100 hover:border-indigo-300 active:scale-[0.98] transition"
                        >
                          Contrato
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPdf(c)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
                        >
                          Descargar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Datos incompletos</span>
                    )}
                  </td>
                  <td className="p-4">
                    {c.status === CONTRACT_STATUS.ACTIVE && (
                      <button type="button" onClick={() => requestTerminate(c)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium">
                        Terminar
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
