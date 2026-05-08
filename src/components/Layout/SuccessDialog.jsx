import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Modal informativo de éxito (un solo botón de cierre).
 */
export default function SuccessDialog({ open, title, message, onClose, closeLabel = 'Aceptar' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="p-5 flex gap-4 bg-emerald-50 items-start">
          <div className="p-2 rounded-full bg-emerald-100 shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-emerald-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="p-4 flex justify-end bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg shadow bg-emerald-600 hover:bg-emerald-700 transition"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
