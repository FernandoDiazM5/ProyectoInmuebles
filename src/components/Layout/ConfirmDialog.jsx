import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Modal de confirmación accesible para acciones destructivas.
 * Reemplaza a window.confirm() en todo el sistema.
 *
 * Props:
 *   open       — boolean para mostrar/ocultar
 *   title      — título del modal
 *   message    — mensaje descriptivo
 *   onConfirm  — callback al confirmar
 *   onCancel   — callback al cancelar
 *   danger     — boolean; usa color rojo si true (default: true)
 */
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className={`p-5 flex items-start gap-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <div className={`p-2 rounded-full ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            {danger
              ? <Trash2 className="w-5 h-5 text-red-600" />
              : <AlertTriangle className="w-5 h-5 text-amber-600" />}
          </div>
          <div>
            <h3 className={`font-bold text-base ${danger ? 'text-red-800' : 'text-amber-800'}`}>
              {title}
            </h3>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="p-4 flex justify-end gap-3 bg-white">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800
                       border border-slate-300 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition shadow
              ${danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
