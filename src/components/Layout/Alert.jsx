import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function Alert({ alert }) {
  if (!alert) return null;
  const isSuccess = alert.type === 'success';
  return (
    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-white shadow-lg animate-fade-in
      ${isSuccess ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {isSuccess ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      <span className="font-medium text-sm">{alert.msg}</span>
    </div>
  );
}
