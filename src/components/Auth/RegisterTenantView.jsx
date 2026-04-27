import React, { useState } from 'react';
import { Home, Loader, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { ROLES } from '../../utils/constants';

export default function RegisterTenantView({ onBack }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Nombre, correo y contraseña son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await setDoc(doc(db, 'users', credential.user.uid), {
        email:     form.email.trim(),
        name:      form.name.trim(),
        phone:     form.phone.trim(),
        role:      ROLES.TENANT,
        isActive:  true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Cerrar sesión para que el usuario ingrese normalmente por el login
      await signOut(auth);
      setDone(true);
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Ya existe una cuenta con ese correo electrónico',
        'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email':        'El correo electrónico no es válido',
      };
      setError(messages[err.code] || 'Error al registrar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Cuenta creada exitosamente</h2>
          <p className="text-slate-500 text-sm mt-2">
            Ya puedes ingresar con tu correo y contraseña.
          </p>
          <button
            onClick={onBack}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Home className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Crear Cuenta</h1>
          <p className="text-slate-500 text-sm mt-1">Registro exclusivo para arrendatarios</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              disabled={loading}
              placeholder="Ej: Juan Pérez"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              disabled={loading}
              placeholder="correo@ejemplo.com"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (opcional)</label>
            <input
              type="text"
              value={form.phone}
              onChange={set('phone')}
              disabled={loading}
              placeholder="Ej: 999 111 222"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña * <span className="text-slate-400 font-normal">(mínimo 6 caracteres)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                disabled={loading}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              disabled={loading}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400
                       text-white font-semibold py-2.5 rounded-lg flex items-center
                       justify-center gap-2 transition shadow-md"
          >
            {loading
              ? <><Loader className="w-4 h-4 animate-spin" /> Creando cuenta...</>
              : 'Crear Cuenta'}
          </button>
        </form>

        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mt-5 mx-auto transition"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}
