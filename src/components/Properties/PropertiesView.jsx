import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { PROPERTY_STATUS } from '../../utils/constants';

function doorSortKey(value) {
  return String(value ?? '').trim();
}

function sortProperties(list) {
  return [...list].sort((a, b) => {
    const fa = Number(a.floor),
      fb = Number(b.floor);
    if (!Number.isNaN(fa) && !Number.isNaN(fb) && fa !== fb) return fa - fb;
    const da = doorSortKey(a.propertyNumber ?? a.doorNumber);
    const dbb = doorSortKey(b.propertyNumber ?? b.doorNumber);
    return da.localeCompare(dbb, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function badgeClass(status) {
  const s = status ?? PROPERTY_STATUS.AVAILABLE;
  if (s === PROPERTY_STATUS.RENTED) return 'bg-blue-100 text-blue-800';
  if (s === PROPERTY_STATUS.MAINTENANCE) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
}

export default function PropertiesView({ properties }) {
  const rows = useMemo(() => sortProperties(properties ?? []), [properties]);

  const sharedAddress = useMemo(() => {
    const list = properties ?? [];
    const addrs = [...new Set(list.map((p) => String(p.address ?? '').trim()).filter(Boolean))];
    if (addrs.length === 1) return addrs[0];
    return null;
  }, [properties]);

  const showAddressColumn = !sharedAddress;

  return (
    <div>
      <h2 className={`text-2xl font-bold text-slate-800 ${sharedAddress ? 'mb-2' : 'mb-6'}`}>
        Inventario de departamentos
      </h2>
      {sharedAddress && (
        <p className="text-slate-600 text-sm mb-6">
          <span className="font-medium text-slate-700">Ubicación:</span> {sharedAddress}
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
              <th className="p-4">Nº puerta</th>
              <th className="p-4">Planta</th>
              <th className="p-4">Habitaciones</th>
              <th className="p-4">Estado</th>
              {showAddressColumn && <th className="p-4">Dirección</th>}
              <th className="p-4">Alquiler / mes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={showAddressColumn ? 6 : 5} className="p-8 text-center text-slate-400 text-sm">
                  No hay departamentos cargados.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-sm">
                  {(p.propertyNumber ?? p.doorNumber) != null && (p.propertyNumber ?? p.doorNumber) !== ''
                    ? String(p.propertyNumber ?? p.doorNumber)
                    : '—'}
                </td>
                <td className="p-4 text-sm tabular-nums">{p.floor != null ? p.floor : '—'}</td>
                <td className="p-4 text-sm tabular-nums">{p.bedrooms != null ? p.bedrooms : '—'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeClass(p.status)}`}>
                    {p.status ?? PROPERTY_STATUS.AVAILABLE}
                  </span>
                </td>
                {showAddressColumn && (
                  <td className="p-4 text-sm text-slate-700">{p.address || '—'}</td>
                )}
                <td className="p-4 text-sm">{p.price != null ? formatCurrency(p.price) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
