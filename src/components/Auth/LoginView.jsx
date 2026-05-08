import React, { useState, useEffect } from 'react';
import { Home, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../../services/authService';

export default function LoginView({ authError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Home className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Inmuebles Pro</h1>
          <p className="text-slate-500 text-sm mt-1">Ingrese sus credenciales para continuar</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="usuario@example.com"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                         disabled:bg-slate-50 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                           disabled:bg-slate-50 transition"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       text-white font-semibold py-2.5 rounded-lg flex items-center
                       justify-center gap-2 transition shadow-md mt-2"
          >
            {loading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Ingresando...</>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        {/* Registro de arrendatario — desactivado: no hay opción de crear cuenta desde el login
        <div className="mt-5 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 mb-2">¿Eres arrendatario y no tienes cuenta?</p>
          <button
            onClick={onRegister}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700
                       font-medium mx-auto transition"
          >
            <UserPlus className="w-4 h-4" />
            Registrarme como Arrendatario
          </button>
        </div>
        */}

        {/* Credenciales de prueba — solo en development */}
        {import.meta.env.VITE_APP_ENV === 'development' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Credenciales de prueba:</p>
            <p>Admin: admin@sistema.com / Admin123</p>
            <p>Agente: agente@test.com / Test123456</p>
            <p>Inquilino: inquilino@test.com / Test123456</p>
            <p>Propietario: propietario@test.com / Test123456</p>
          </div>
        )}
      </div>
    </div>
  );
}
