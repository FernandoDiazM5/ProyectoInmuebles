import React, { useState } from 'react';
import { Home, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ROLES } from '../../utils/constants';

const ROLE_OPTIONS = [
  { value: ROLES.AGENT,  label: 'Agente Inmobiliario',  desc: 'Acceso completo: arrendatarios, contratos, pagos y reportes.' },
  { value: ROLES.OWNER,  label: 'Propietario',          desc: 'Vista de reportes y cobranza.' },
  { value: ROLES.TENANT, label: 'Arrendatario',         desc: 'Portal de pagos y consulta de historial.' },
];

export default function SetupView({ firebaseUser, onProfileCreated }) {
  const [name, setName]     = useState('');
  const [role, setRole]     = useState(ROLES.AGENT);
  const [phone, setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      // Crear documento en Firestore users/{uid}
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: firebaseUser.email,
        name:  name.trim(),
        role,
        phone: phone.trim(),
        isActive:  true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDone(true);
      // Esperar 1 s para que el usuario vea el mensaje de éxito y luego continuar
      setTimeout(() => onProfileCreated(), 1000);
    } catch (err) {
      setError('Error al crear el perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Perfil creado</h2>
          <p className="text-slate-500 text-sm mt-1">Ingresando al sistema…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow mb-3">
            <Home className="text-white w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Configuración inicial de perfil</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Tu cuenta <span className="font-medium text-blue-600">{firebaseUser.email}</span> está
            autenticada pero aún no tiene perfil en el sistema. Completa los datos para continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (opcional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 999 111 222"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rol en el sistema *</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition
                    ${role === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="font-medium text-sm text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       text-white font-semibold py-2.5 rounded-lg flex items-center
                       justify-center gap-2 transition shadow-md mt-2"
          >
            {loading ? <><Loader className="w-4 h-4 animate-spin" /> Creando perfil…</> : 'Crear perfil y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
